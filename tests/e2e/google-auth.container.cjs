/* eslint-disable */
// Test d'intégration de la connexion Google — À EXÉCUTER DANS LE CONTENEUR identity-api (base locale) :
//
//   docker cp tests/e2e/google-auth.container.cjs poramma-identity:/tmp/google-auth.container.cjs
//   docker exec poramma-identity node /tmp/google-auth.container.cjs
//
// Il ne contacte jamais Google : il génère une paire de clés RSA, sert son JWKS sur un port local
// (GOOGLE_JWKS_URL), signe de vrais ID tokens RS256 et appelle l'application Express réelle (dist/app.js,
// vraies routes, vraie base, vrai Redis). Ses comptes de test (@gsep.test) sont supprimés à la fin.
// Ne jamais le lancer contre la production.
const http = require("http");
const crypto = require("crypto");
const { createRequire } = require("module");
const req = createRequire("/app/package.json");
const jwt = req("jsonwebtoken");
const bcrypt = req("bcryptjs");

const CLIENT_ID = "test-client-id.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
process.env.GOOGLE_JWKS_URL = "http://127.0.0.1:9911/jwks";

let ok = 0, ko = 0;
const t = (c, l, x) => { if (c) { ok++; console.log("  ✓ " + l); } else { ko++; console.log("  ✗ " + l + (x !== undefined ? "  → " + JSON.stringify(x).slice(0, 200) : "")); } };
const section = (s) => console.log("\n" + s);

// ── Clés et serveur JWKS local ─────────────────────────────────────────────
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const { privateKey: otherPrivate } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const KID = "test-key-1";
const jwks = { keys: [{ ...publicKey.export({ format: "jwk" }), kid: KID, alg: "RS256", use: "sig" }] };
let jwksHits = 0, jwksDown = false;
const jwksServer = http.createServer((q, s) => {
  jwksHits++;
  if (jwksDown) { s.statusCode = 500; return s.end("down"); }
  s.setHeader("content-type", "application/json"); s.setHeader("cache-control", "public, max-age=3600");
  s.end(JSON.stringify(jwks));
}).listen(9911, "127.0.0.1");

const sub = () => "g" + crypto.randomBytes(8).toString("hex");
function idToken(claims = {}, opts = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: "https://accounts.google.com", aud: CLIENT_ID, sub: sub(), email: "x@gsep.test", email_verified: true, given_name: "Aïssata", family_name: "Traoré", iat: now, exp: now + 3600, ...claims };
  for (const k of Object.keys(payload)) if (payload[k] === undefined) delete payload[k];
  const o = { algorithm: opts.alg || "RS256" };
  if (opts.kid !== null) o.keyid = opts.kid || KID;
  return jwt.sign(payload, opts.key || privateKey, o);
}

(async () => {
  const { db } = req("/app/dist/db/connection");
  const S = req("/app/dist/db/schema.identity");
  const authService = req("/app/dist/modules/auth/auth.service");
  const googleMod = req("/app/dist/modules/auth/google");
  const { checkRateLimit } = req("/app/node_modules/@poramma/cache");
  const { eq, sql } = req("/app/node_modules/drizzle-orm");
  const app = req("/app/dist/app").default;
  const server = await new Promise((r) => { const s = app.listen(0, "127.0.0.1", () => r(s)); });
  const BASE = "http://127.0.0.1:" + server.address().port;
  const call = async (m, p, tok, body) => {
    const r = await fetch(BASE + p, { method: m, headers: { "Content-Type": "application/json", ...(tok ? { Authorization: "Bearer " + tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
    let j = null; try { j = await r.json(); } catch {}
    return { s: r.status, j };
  };
  const stamp = Date.now();
  const mail = (n) => `${n}.${stamp}@gsep.test`;
  const flushRate = async () => { const { getRedisClient } = req("/app/node_modules/@poramma/cache"); const r = getRedisClient(); const ks = await r.keys("poramma:ratelimit:*"); if (ks.length) await r.del(...ks); };
  const rowOf = async (email) => (await db.select().from(S.users).where(sql`lower(${S.users.email}) = ${email.toLowerCase()}`))[0];
  const mkUser = async (email, { password = "MotDePasse#2026", ...extra } = {}) => {
    const [u] = await db.insert(S.users).values({ email, passwordHash: await bcrypt.hash(password, 10), status: "VERIFIED", emailVerified: true, ...extra }).returning();
    await db.insert(S.userProfiles).values({ userId: u.id, firstName: "Test", lastName: "Compte", userType: "student" });
    return { ...u, password };
  };
  const created = [];
  const track = (e) => created.push(e.toLowerCase());

  try {
    await flushRate();

    section("1. Configuration publique");
    let r = await call("GET", "/auth/config");
    t(r.s === 200 && r.j?.data?.google?.clientId === CLIENT_ID, "GET /auth/config expose l'identifiant client", r.j);
    delete process.env.GOOGLE_CLIENT_ID;
    r = await call("GET", "/auth/config");
    t(r.s === 200 && r.j?.data?.google === null, "sans GOOGLE_CLIENT_ID → google: null (le bouton se cache)", r.j);
    r = await call("POST", "/auth/google", null, { credential: idToken() });
    t(r.s === 503, "sans GOOGLE_CLIENT_ID → 503 explicite", r.s);
    for (const [label, bad] of [["secret client collé à la place de l'ID", "GOCSPX-6JF_exemple_de_secret"], ["ID client précédé de GOCSPX-", "GOCSPX-571673797408-abc.apps.googleusercontent.com"], ["valeur sans le domaine Google", "571673797408-abc"]]) {
      process.env.GOOGLE_CLIENT_ID = bad;
      r = await call("GET", "/auth/config");
      t(r.s === 200 && r.j?.data?.google === null, `valeur invalide refusée, bouton masqué : ${label}`, r.j);
      const rr = await call("POST", "/auth/google", null, { credential: idToken() });
      t(rr.s === 503, `valeur invalide : /auth/google → 503 (${label})`, rr.s);
    }
    process.env.GOOGLE_CLIENT_ID = CLIENT_ID;

    section("2. Inscription avec Google (nouveau compte)");
    const e1 = mail("nouveau"); track(e1); const sub1 = sub();
    r = await call("POST", "/auth/google", null, { credential: idToken({ sub: sub1, email: e1.toUpperCase() }) });
    t(r.s === 201 && r.j?.data?.isNewUser === true, "201 et isNewUser", [r.s, r.j?.data?.isNewUser]);
    const u1 = r.j?.data?.user;
    t(u1?.email === e1 && u1?.emailVerified === true && u1?.status === "VERIFIED", "email normalisé en minuscules, vérifié d'office", [u1?.email, u1?.status]);
    t(u1?.authMethods?.google === true && u1?.authMethods?.password === false, "authMethods : Google oui, mot de passe non", u1?.authMethods);
    t(u1?.profile?.firstName === "Aïssata" && u1?.profile?.lastName === "Traoré", "prénom/nom repris de Google", u1?.profile);
    t(u1?.mustChangePassword === false && (u1?.permissions ?? []).length === 0 && u1?.activeRole == null, "simple membre : aucun rôle, aucune permission");
    const me = await call("GET", "/auth/me", r.j?.data?.accessToken);
    t(me.s === 200 && me.j?.data?.id === u1?.id, "le jeton de session délivré fonctionne (/auth/me)", me.s);
    const refreshed = await call("POST", "/auth/refresh", null, { refreshToken: r.j?.data?.refreshToken });
    t(refreshed.s === 200, "le refresh token fonctionne", refreshed.s);

    section("3. Reconnexion (même compte Google)");
    r = await call("POST", "/auth/google", null, { credential: idToken({ sub: sub1, email: e1 }), rememberMe: true });
    t(r.s === 200 && r.j?.data?.isNewUser === false && r.j?.data?.user?.id === u1.id, "200, même compte, pas de doublon", [r.s, r.j?.data?.isNewUser]);
    const cnt = (await db.select({ n: sql`count(*)::int` }).from(S.users).where(sql`lower(${S.users.email}) = ${e1}`))[0].n;
    t(cnt === 1, "un seul compte en base", cnt);
    const pw = await call("POST", "/auth/login", null, { email: e1, password: "n'importe-quoi-123" });
    t(pw.s === 401, "le compte Google seul ne se connecte pas par mot de passe", pw.s);

    section("4. Jetons invalides refusés");
    const bad = {
      "mauvaise audience": idToken({ aud: "autre-app.apps.googleusercontent.com" }),
      "mauvais émetteur": idToken({ iss: "https://evil.example" }),
      "expiré": idToken({ iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 }),
      "émis il y a plus de 10 min": idToken({ iat: Math.floor(Date.now() / 1000) - 1200 }),
      "email non vérifié": idToken({ email_verified: false }),
      "sans email": idToken({ email: undefined }),
      "signé par une autre clé": idToken({}, { key: otherPrivate }),
      "kid inconnu": idToken({}, { kid: "inconnue" }),
      "sans kid": idToken({}, { kid: null }),
      "HS256 (confusion d'algorithme)": jwt.sign({ iss: "https://accounts.google.com", aud: CLIENT_ID, sub: "x", email: "x@gsep.test", email_verified: true, iat: Math.floor(Date.now() / 1000) }, "secret", { algorithm: "HS256", keyid: KID }),
      "alg none": [Buffer.from(JSON.stringify({ alg: "none", kid: KID, typ: "JWT" })).toString("base64url"), Buffer.from(JSON.stringify({ iss: "https://accounts.google.com", aud: CLIENT_ID, sub: "x", email: "x@gsep.test", email_verified: true, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 600 })).toString("base64url"), ""].join("."),
      "charge utile modifiée": (() => { const g = idToken({ email: "a@gsep.test" }).split("."); g[1] = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(g[1], "base64url")), email: "admin@poramma.ml" })).toString("base64url"); return g.join("."); })(),
      "texte quelconque": "ceci-n-est-pas-un-jeton-du-tout",
    };
    for (const [label, tok] of Object.entries(bad)) {
      r = await call("POST", "/auth/google", null, { credential: tok });
      t(r.s === 401 || r.s === 422, `refusé : ${label}`, r.s);
    }
    t(!(await rowOf("admin@poramma.ml"))?.googleSub, "aucun lien n'a été posé sur le compte admin par les jetons forgés");
    r = await call("POST", "/auth/google", null, {});
    t(r.s === 422, "corps vide → 422", r.s);

    section("5. Rattachement par email à un compte existant");
    await flushRate();
    const e2 = mail("existant"); track(e2);
    const m2 = await mkUser(e2.replace("existant", "Existant"));
    track(m2.email);
    r = await call("POST", "/auth/google", null, { credential: idToken({ email: e2 }) });
    t(r.s === 200 && r.j?.data?.isNewUser === false && r.j?.data?.user?.id === m2.id, "même adresse (casse différente) → liaison, pas de doublon", [r.s, r.j?.data?.user?.id === m2.id]);
    t(r.j?.data?.user?.authMethods?.google === true && r.j?.data?.user?.authMethods?.password === true, "le mot de passe reste actif en plus de Google", r.j?.data?.user?.authMethods);
    const pw2 = await call("POST", "/auth/login", null, { email: m2.email, password: m2.password });
    t(pw2.s === 200, "la connexion par mot de passe fonctionne toujours", pw2.s);

    section("6. Compte enrôlé à l'ambassade (mot de passe par défaut)");
    await flushRate();
    const e3 = mail("enrole"); track(e3);
    const m3 = await mkUser(e3, { password: "DefautAmbassade1", mustChangePassword: true, emailVerified: false, status: "UNVERIFIED" });
    const oldSession = await call("POST", "/auth/login", null, { email: e3, password: "DefautAmbassade1" });
    r = await call("POST", "/auth/google", null, { credential: idToken({ email: e3 }) });
    const u3 = r.j?.data?.user;
    t(r.s === 200 && u3?.emailVerified === true && u3?.status === "VERIFIED", "email vérifié par Google, compte activé", [r.s, u3?.status]);
    t(u3?.mustChangePassword === false && u3?.authMethods?.password === false, "étape « choisir un mot de passe » levée, plus de mot de passe actif", u3?.authMethods);
    const old = await call("POST", "/auth/login", null, { email: e3, password: "DefautAmbassade1" });
    t(old.s === 401, "le mot de passe par défaut connu de l'agent est invalidé", old.s);
    const oldMe = await call("GET", "/auth/me", oldSession.j?.data?.accessToken);
    t(oldMe.s === 401, "les sessions ouvertes avant la liaison sont révoquées", oldMe.s);

    section("7. Personnel de l'ambassade refusé");
    const adminBefore = await rowOf("admin@poramma.ml");
    r = await call("POST", "/auth/google", null, { credential: idToken({ email: "admin@poramma.ml" }) });
    t(r.s === 403, "le compte admin de l'ambassade ne peut pas utiliser Google", r.s);
    t(!(await rowOf("admin@poramma.ml")).googleSub, "aucun lien posé");
    const audit = await db.execute(sql`select domain, result, details->>'reason' as reason from audit.audit_logs where action='LOGIN_ATTEMPT' and entity_id = ${adminBefore.id} order by at desc limit 1`);
    const arow = (audit.rows ?? audit)[0];
    t(arow?.reason === "STAFF_ACCOUNT" && arow?.domain === "EMBASSY", "tentative tracée dans le journal de l'AMBASSADE", arow);

    section("8. Compte suspendu / lié à un autre Google");
    await flushRate();
    const e4 = mail("suspendu"); track(e4);
    const m4 = await mkUser(e4, { status: "SUSPENDED" });
    r = await call("POST", "/auth/google", null, { credential: idToken({ email: e4 }) });
    t(r.s === 401 && /suspendu/i.test(r.j?.message ?? ""), "suspendu → refusé", [r.s, r.j?.message]);
    t(!(await rowOf(e4)).googleSub, "un compte suspendu n'est pas lié");
    const e5 = mail("autrelie"); track(e5);
    await mkUser(e5, { googleSub: "sub-deja-lie-" + stamp });
    r = await call("POST", "/auth/google", null, { credential: idToken({ email: e5, sub: "un-autre-sub-" + stamp }) });
    t(r.s === 409, "email déjà lié à un AUTRE compte Google → 409", r.s);

    section("9. Liaison / dissociation depuis les paramètres");
    await flushRate();
    await flushRate();
    const e6 = mail("lien"); track(e6);
    const m6 = await mkUser(e6);
    const login6 = await call("POST", "/auth/login", null, { email: e6, password: m6.password });
    const tok6 = login6.j?.data?.accessToken;
    r = await call("POST", "/auth/google/link", null, { credential: idToken({ email: e6 }) });
    t(r.s === 401, "liaison sans session → 401", r.s);
    r = await call("POST", "/auth/google/link", tok6, { credential: idToken({ email: "autre@gsep.test" }) });
    t(r.s === 422, "adresse Google différente → refusée", r.s);
    const subLink = sub();
    r = await call("POST", "/auth/google/link", tok6, { credential: idToken({ email: e6, sub: subLink }) });
    t(r.s === 200 && (await rowOf(e6)).googleSub === subLink, "liaison réussie", r.s);
    const e7 = mail("lien2"); track(e7);
    const m7 = await mkUser(e7);
    const tok7 = (await call("POST", "/auth/login", null, { email: e7, password: m7.password })).j?.data?.accessToken;
    r = await call("POST", "/auth/google/link", tok7, { credential: idToken({ email: e7, sub: subLink }) });
    t(r.s === 409, "un compte Google déjà lié ailleurs → 409", r.s);
    r = await call("DELETE", "/auth/google", tok6);
    t(r.s === 200 && !(await rowOf(e6)).googleSub, "dissociation (mot de passe défini) → OK", r.s);
    // Compte Google seul : dissociation interdite tant qu'aucun mot de passe n'existe
    const tokG = (await call("POST", "/auth/google", null, { credential: idToken({ sub: sub1, email: e1 }) })).j?.data?.accessToken;
    r = await call("DELETE", "/auth/google", tokG);
    t(r.s === 409 && (await rowOf(e1)).googleSub === sub1, "compte Google seul : dissociation refusée (409)", [r.s, r.j?.message]);
    await flushRate();
    // Définir un mot de passe par la réinitialisation (code par email), puis dissocier
    const code = await authService.createPasswordResetCode(e1);
    await authService.resetPasswordWithCode({ email: e1, code: code.code, newPassword: "NouveauMdp#2026" });
    t((await rowOf(e1)).passwordSet === true, "la réinitialisation marque le mot de passe comme défini");
    const relog = await call("POST", "/auth/login", null, { email: e1, password: "NouveauMdp#2026" });
    t(relog.s === 200 && relog.j?.data?.user?.authMethods?.password === true, "connexion par mot de passe désormais possible", relog.s);
    r = await call("DELETE", "/auth/google", relog.j?.data?.accessToken);
    t(r.s === 200 && !(await rowOf(e1)).googleSub, "puis dissociation autorisée", r.s);

    section("10. Concurrence, disponibilité de Google, limitation");
    await flushRate();
    const e8 = mail("course"); track(e8); const sub8 = sub();
    const tokRace = idToken({ sub: sub8, email: e8 });
    const rs = await Promise.all([1, 2, 3, 4].map(() => call("POST", "/auth/google", null, { credential: tokRace })));
    const ids = new Set(rs.filter((x) => x.s < 300).map((x) => x.j?.data?.user?.id));
    const n8 = (await db.select({ n: sql`count(*)::int` }).from(S.users).where(sql`lower(${S.users.email}) = ${e8}`))[0].n;
    t(rs.every((x) => x.s === 200 || x.s === 201) && ids.size === 1 && n8 === 1, "4 connexions simultanées d'un nouveau compte → 1 seul compte, 4 succès", { statuses: rs.map((x) => x.s), n8 });
    googleMod.resetGoogleKeyCache(); jwksDown = true;
    r = await call("POST", "/auth/google", null, { credential: idToken({ email: mail("jwksdown") }) });
    t(r.s === 503, "clés Google injoignables → 503 (pas 401 : ce n'est pas la faute de l'usager)", r.s);
    jwksDown = false;
    const before = jwksHits;
    googleMod.resetGoogleKeyCache();
    for (let i = 0; i < 3; i++) await call("POST", "/auth/google", null, { credential: idToken({}, { kid: "kid-forge-" + i }) });
    t(jwksHits - before <= 1, "des kid inconnus en rafale ne provoquent qu'une récupération des clés (≤ 1/min)", jwksHits - before);
    await flushRate();
    let last = 0;
    for (let i = 0; i < 65; i++) last = (await call("POST", "/auth/google", null, { credential: "x".repeat(30) })).s;
    t(last === 429, "au-delà de 60 tentatives / 15 min → 429", last);
    await flushRate();

    section("11. Journal d'audit");
    const rows = (await db.execute(sql`select action, domain, details->>'method' as method from audit.audit_logs where actor_user_id = ${u1.id} order by at`)).rows;
    t(rows.some((x) => x.action === "REGISTER" && x.method === "google" && x.domain === "COMMUNITY"), "inscription Google tracée (COMMUNITY)", rows);
    t(rows.some((x) => x.action === "LOGIN" && x.method === "google" && x.domain === "COMMUNITY"), "connexion Google tracée avec method=google", rows);
    const link = (await db.execute(sql`select count(*)::int as n from audit.audit_logs where action='LINK_GOOGLE' and actor_user_id in (${m2.id}, ${m3.id})`)).rows[0].n;
    t(link === 2, "les liaisons par email sont tracées (WARNING)", link);
  } catch (e) {
    ko++; console.log("\nERREUR DU TEST :", e && e.stack || e);
  } finally {
    try {
      const ids = (await db.execute(sql`select id from identity.users where lower(email) like '%@gsep.test'`)).rows.map((x) => x.id);
      if (ids.length) {
        const list = sql.join(ids.map((i) => sql`${i}::uuid`), sql`, `);
        await db.execute(sql`delete from audit.audit_logs where actor_user_id in (${list}) or entity_id in (select id::text from identity.users where lower(email) like '%@gsep.test') or entity_id like '%@gsep.test'`);
        await db.execute(sql`delete from identity.sessions where user_id in (${list})`);
        await db.execute(sql`delete from identity.otps where user_id like '%@gsep.test'`).catch(() => {});
        await db.execute(sql`delete from identity.user_profiles where user_id in (${list})`);
        await db.execute(sql`delete from identity.users where id in (${list})`);
      }
      await db.execute(sql`delete from audit.audit_logs where entity_id like '%@gsep.test'`);
      console.log(`\n(nettoyage : ${ids.length} compte(s) de test supprimé(s))`);
    } catch (e) { console.log("\n(nettoyage partiel :", String(e.message).split("\n")[0] + ")"); }
    console.log(`\n${ok}/${ok + ko} vérifications réussies${ko ? ` — ${ko} ÉCHEC(S)` : ""}`);
    jwksServer.close();
    process.exit(ko ? 1 : 0);
  }
})();
