/* eslint-disable */
// Test de non-régression : accueil (urgences, demandes sur place, recherche de membres) et escalade d'une demande.
//
// Prérequis : pile locale démarrée (docker compose up -d) avec le compte admin@poramma.ml, des agents affectés
// à `sub-001` et des horaires actifs pour ce service (jeu de données de développement).
// Lancement : node tests/e2e/reception-urgence.cjs        (BASE=http://localhost par défaut)
//
// Le test crée ses propres comptes (@acc.test), ses rendez-vous et ses demandes sur place, et restaure la priorité /
// le statut de la demande qu'il escalade. Il ne faut PAS le lancer contre la production.
const { spawnSync } = require("child_process");
const path = require("path");
const bcrypt = require("module").createRequire(path.join(__dirname, "../../services/identity-api/package.json"))("bcryptjs");

const BASE = process.env.BASE || "http://localhost";
const DB_CONTAINER = process.env.PSQL_DOCKER_CONTAINER || "poramma-db";
const ADMIN = { email: process.env.EMBASSY_ADMIN_EMAIL || "admin@poramma.ml", password: process.env.EMBASSY_ADMIN_PASSWORD || "Admin@Poramma2026!" };
const SERVICE = process.env.TEST_SUB_SERVICE || "sub-001";
const PASSWORD = "AccTest#2026-abc";

let failures = 0;
const ok = (cond, label, extra) => {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}${extra !== undefined ? `  → ${typeof extra === "string" ? extra : JSON.stringify(extra).slice(0, 260)}` : ""}`);
  }
};
const section = (t) => console.log(`\n${t}`);

function sql(query) {
  const r = spawnSync("docker", ["exec", "-i", DB_CONTAINER, "psql", "-U", process.env.PGUSER || "poramma", "-d", process.env.PGDATABASE || "poramma", "-tA", "-F", "|", "-v", "ON_ERROR_STOP=1"], { input: query, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`SQL: ${r.stderr}`);
  return r.stdout.trim();
}

async function call(method, url, token, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), "X-Client-App": "test" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

function createMember(email, label, etudiantStatus) {
  const hash = bcrypt.hashSync(PASSWORD, 10);
  const id = sql(`WITH u AS (INSERT INTO identity.users (id,email,password_hash,email_verified,status) VALUES (gen_random_uuid(),'${email}','${hash}',true,'VERIFIED') RETURNING id),
    p AS (INSERT INTO identity.user_profiles (id,user_id,user_type,first_name,last_name) SELECT gen_random_uuid(),id,'student','Acc','${label}' FROM u RETURNING user_id)
    SELECT id FROM u;`).split("\n")[0];
  if (etudiantStatus) {
    sql(`INSERT INTO ambassade.etudiants (id,user_id,status,inue,submitted_at) VALUES ('etu-acc-${id}','${id}','${etudiantStatus}',${etudiantStatus === "VALIDATED" ? `'ACC${Date.now().toString().slice(-8)}'` : "NULL"},now());`);
  }
  return id;
}

/** Prochain jour ouvré (lundi–vendredi) strictement après aujourd'hui. */
function nextWeekday() {
  const d = new Date();
  do d.setUTCDate(d.getUTCDate() + 1);
  while ([0, 6].includes(d.getUTCDay()));
  return d.toISOString().slice(0, 10);
}

async function main() {
  const stamp = Date.now();
  const tag = `acc${stamp}`;
  const validated = createMember(`valide.${stamp}@acc.test`, `${tag}valide`, "VALIDATED");
  const pending = createMember(`attente.${stamp}@acc.test`, `${tag}attente`, "PENDING");
  const noRecord = createMember(`sansdossier.${stamp}@acc.test`, `${tag}sansdossier`, null);
  const memberIds = [validated, pending, noRecord];
  const ticketIds = [];
  let escalated = null;

  try {
    const admin = (await call("POST", "/auth/login", null, ADMIN)).json?.data?.accessToken;
    if (!admin) throw new Error("connexion admin impossible");

    section("A. Recherche de membres : uniquement les profils validés");
    const search = await call("GET", `/reception/members?q=${tag}`, admin);
    ok(search.status === 200, "la recherche répond 200", search.status);
    const found = (search.json?.data ?? []).map((m) => m.id);
    ok(found.length === 1 && found[0] === validated, "seul le membre validé est trouvé", found);

    section("B. Demande sur place : rattachement d'un membre");
    const wiBad = await call("POST", "/reception/walk-ins", admin, { userId: pending, category: "INFORMATION", subject: "Test membre non validé" });
    ok(wiBad.status === 422, "un membre non validé est refusé", wiBad.status);
    const wiBad2 = await call("POST", "/reception/walk-ins", admin, { userId: noRecord, category: "INFORMATION", subject: "Test membre sans dossier" });
    ok(wiBad2.status === 422, "un compte sans dossier d'enregistrement est refusé", wiBad2.status);
    const wiOk = await call("POST", "/reception/walk-ins", admin, { userId: validated, category: "INFORMATION", subject: "Test membre validé" });
    ok(wiOk.status === 201, "un membre validé est accepté", wiOk.status);
    const wiVisitor = await call("POST", "/reception/walk-ins", admin, { visitorName: "Visiteur Test", category: "INFORMATION", subject: "Test sans compte" });
    ok(wiVisitor.status === 201, "un visiteur sans compte reste possible", wiVisitor.status);

    section("C. Urgence : immédiate");
    const visitor = { lastName: "Test", firstName: "Immediat", phone: "+212612345678", city: "Rabat" };
    const imm = await call("POST", "/reception/urgences", admin, { subServiceId: SERVICE, motif: "Test immédiat", urgenceJustification: "Test e2e", visitor });
    ok(imm.status === 201, "urgence immédiate créée", imm.text.slice(0, 200));
    if (imm.json?.data?.ticketId) ticketIds.push(imm.json.data.ticketId);
    ok(imm.json?.data?.startTime === null && imm.json?.data?.type === "URGENCE", "sans horaire : startTime null, type URGENCE", imm.json?.data);
    const immSlot = sql(`SELECT coalesce(slot_id,'NULL') FROM ambassade.rendez_vous WHERE ticket_id='${imm.json?.data?.ticketId}'`);
    ok(immSlot === "NULL", "aucun créneau consommé");

    section("D. Urgence : sur un créneau du service");
    const date = nextWeekday();
    const slots = await call("GET", `/reception/urgences/slots?subServiceId=${SERVICE}&date=${date}`, admin);
    ok(slots.status === 200 && Array.isArray(slots.json?.data) && slots.json.data.length > 0, `créneaux libres proposés pour ${date}`, slots.text.slice(0, 200));
    const first = slots.json?.data?.[0]?.startTime;
    const body = (extra) => ({ subServiceId: SERVICE, motif: "Test créneau", urgenceJustification: "Test e2e", visitor, startTime: first, date, ...extra });
    const s1 = await call("POST", "/reception/urgences", admin, body());
    ok(s1.status === 201 && s1.json?.data?.startTime === first && s1.json?.data?.date === date, "urgence planifiée au créneau choisi", s1.text.slice(0, 220));
    if (s1.json?.data?.ticketId) ticketIds.push(s1.json.data.ticketId);
    const row = sql(`SELECT slot_id, type, is_urgent FROM ambassade.rendez_vous WHERE ticket_id='${s1.json?.data?.ticketId}'`);
    ok(row.startsWith(`slot|${SERVICE}|`) && row.endsWith("|URGENCE|t"), "créneau réservé (slot_id), type URGENCE", row);

    // Tant qu'un autre agent est libre à cette heure, on peut encore réserver ; ensuite le créneau est épuisé.
    let guard = 0;
    let last = s1;
    while (last.status === 201 && guard++ < 6) {
      last = await call("POST", "/reception/urgences", admin, body());
      if (last.json?.data?.ticketId) ticketIds.push(last.json.data.ticketId);
    }
    ok(last.status === 409, "créneau épuisé : refus 409 clair", [last.status, last.json?.message]);
    const after = await call("GET", `/reception/urgences/slots?subServiceId=${SERVICE}&date=${date}`, admin);
    ok(!(after.json?.data ?? []).some((s) => s.startTime === first), "le créneau épuisé n'est plus proposé");

    const offHours = await call("POST", "/reception/urgences", admin, body({ startTime: "03:00" }));
    ok(offHours.status === 422, "un horaire hors des horaires du service est refusé", [offHours.status, offHours.json?.message]);
    const pastDate = await call("POST", "/reception/urgences", admin, body({ date: "2020-01-06" }));
    ok(pastDate.status === 422, "une date passée est refusée", pastDate.status);
    const dateNoTime = await call("POST", "/reception/urgences", admin, { subServiceId: SERVICE, motif: "x y z", urgenceJustification: "x y z", visitor, date });
    ok(dateNoTime.status === 422, "une date sans heure est refusée", dateNoTime.status);

    section("E. Urgence : rattachement d'un membre");
    const uBad = await call("POST", "/reception/urgences", admin, { subServiceId: SERVICE, motif: "Test membre", urgenceJustification: "Test e2e", userId: pending });
    ok(uBad.status === 422, "membre non validé refusé", uBad.status);
    const uOk = await call("POST", "/reception/urgences", admin, { subServiceId: SERVICE, motif: "Test membre", urgenceJustification: "Test e2e", userId: validated });
    ok(uOk.status === 201, "membre validé accepté", uOk.status);
    if (uOk.json?.data?.ticketId) ticketIds.push(uOk.json.data.ticketId);

    section("F. Escalade d'une demande : la priorité monte");
    const target = sql("SELECT id||'|'||status||'|'||priority FROM ambassade.demandes WHERE status IN ('SUBMITTED','IN_REVIEW') AND priority='NORMAL' ORDER BY created_at LIMIT 1");
    if (!target) throw new Error("aucune demande ouverte de priorité normale pour tester l'escalade");
    const [dId, dStatus, dPriority] = target.split("|");
    escalated = { id: dId, status: dStatus, priority: dPriority };
    const esc = await call("PATCH", `/demandes/${dId}/status`, admin, { status: "IN_REVIEW", comment: "ESCALADE: test e2e", isVisibleToUser: false, priority: "HIGH" });
    ok(esc.status === 200 && esc.json?.data?.priority === "HIGH", "priorité relevée à HIGH", [esc.status, esc.json?.data?.priority]);
    const inList = await call("GET", "/demandes?priority=HIGH&limit=100", admin);
    const listed = (inList.json?.data?.items ?? inList.json?.data ?? []).find?.((d) => d.id === dId);
    ok(listed?.priority === "HIGH", "la liste des demandes affiche la nouvelle priorité", listed?.priority);
    const again = await call("PATCH", `/demandes/${dId}/status`, admin, { status: "IN_REVIEW", comment: "ESCALADE: test e2e (2)", isVisibleToUser: false, priority: "NORMAL" });
    ok(again.status === 200 && again.json?.data?.priority === "HIGH", "une priorité plus basse ne l'abaisse jamais", again.json?.data?.priority);
    const plain = await call("PATCH", `/demandes/${dId}/status`, admin, { status: "IN_REVIEW", comment: "Simple changement de statut", isVisibleToUser: false });
    ok(plain.status === 200 && plain.json?.data?.priority === "HIGH", "un changement de statut sans priorité ne touche pas la priorité", plain.json?.data?.priority);
    const badPrio = await call("PATCH", `/demandes/${dId}/status`, admin, { status: "IN_REVIEW", comment: "x", isVisibleToUser: false, priority: "MEGA" });
    ok(badPrio.status === 422, "une priorité inconnue est refusée", badPrio.status);
  } finally {
    const ids = memberIds.map((i) => `'${i}'`).join(",");
    const tickets = ticketIds.map((t) => `'${t}'`).join(",") || "''";
    try {
      sql(`DELETE FROM ambassade.rendez_vous WHERE ticket_id IN (${tickets});
           DELETE FROM ambassade.walk_in_requests WHERE user_id IN (${ids}) OR visitor_name='Visiteur Test';
           DELETE FROM ambassade.notifications WHERE user_id IN (${ids});
           DELETE FROM ambassade.etudiants WHERE user_id IN (${ids});
           DELETE FROM identity.sessions WHERE user_id IN (${ids});
           DELETE FROM identity.user_profiles WHERE user_id IN (${ids});
           DELETE FROM identity.users WHERE id IN (${ids});`);
      if (escalated) {
        sql(`DELETE FROM ambassade.demande_histories WHERE demande_id='${escalated.id}' AND comment IN ('ESCALADE: test e2e','ESCALADE: test e2e (2)','Simple changement de statut');
             UPDATE ambassade.demandes SET status='${escalated.status}', priority='${escalated.priority}' WHERE id='${escalated.id}';`);
      }
    } catch (e) {
      console.log("  ! nettoyage incomplet :", e.message);
    }
  }

  console.log(failures ? `\n${failures} vérification(s) en échec.` : "\nToutes les vérifications passent.");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
