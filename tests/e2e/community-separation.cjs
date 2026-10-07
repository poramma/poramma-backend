/* eslint-disable */
// Test de non-régression : séparation ambassade / plateforme communautaire.
//
// Prérequis : pile locale démarrée (docker compose up -d), migrations identity 0016 + ambassade 0017
// appliquées, seed-community.sql appliqué, et un administrateur communautaire créé :
//   PSQL_DOCKER_CONTAINER=poramma-db COMMUNITY_ADMIN_EMAIL=admin.communaute@test.local \
//   COMMUNITY_ADMIN_PASSWORD='TestCommunaute#2026' bash infra/db/create-community-admin.sh
// Lancement : node tests/e2e/community-separation.cjs        (BASE=http://localhost par défaut)
//
// Le test crée ses propres comptes de test (@sep.test), les supprime à la fin, et ne modifie aucun
// compte existant. Il ne faut PAS le lancer contre la production.
const { spawnSync } = require("child_process");
const path = require("path");
const bcrypt = require("module").createRequire(path.join(__dirname, "../../services/identity-api/package.json"))("bcryptjs");

const BASE = process.env.BASE || "http://localhost";
const DB_CONTAINER = process.env.PSQL_DOCKER_CONTAINER || "poramma-db";
const EMBASSY_ADMIN = { email: process.env.EMBASSY_ADMIN_EMAIL || "admin@poramma.ml", password: process.env.EMBASSY_ADMIN_PASSWORD || "Admin@Poramma2026!" };
const COMMUNITY_ADMIN = { email: process.env.COMMUNITY_ADMIN_EMAIL || "admin.communaute@test.local", password: process.env.COMMUNITY_ADMIN_PASSWORD || "TestCommunaute#2026" };
const PASSWORD = "SepTest#2026-abc";

let failures = 0;
let checks = 0;
const ok = (cond, label, extra) => {
  checks++;
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures++;
    console.log(`  ✗ ${label}${extra !== undefined ? `  → ${typeof extra === "string" ? extra : JSON.stringify(extra).slice(0, 220)}` : ""}`);
  }
};
const section = (t) => console.log(`\n${t}`);

function sql(query) {
  const r = spawnSync("docker", ["exec", "-i", DB_CONTAINER, "psql", "-U", process.env.PGUSER || "poramma", "-d", process.env.PGDATABASE || "poramma", "-tA", "-F", "|", "-v", "ON_ERROR_STOP=1"], { input: query, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`SQL: ${r.stderr}`);
  return r.stdout.trim();
}

async function call(method, url, token, body, headers = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

async function login(email, password) {
  const r = await call("POST", "/auth/login", null, { email, password }, { "X-Client-App": "test" });
  if (r.status !== 200) throw new Error(`login ${email} → ${r.status} ${r.text.slice(0, 120)}`);
  return { token: r.json.data.accessToken, user: r.json.data.user };
}

function createMember(email) {
  const hash = bcrypt.hashSync(PASSWORD, 10);
  const id = sql(`WITH u AS (INSERT INTO identity.users (id,email,password_hash,email_verified,status) VALUES (gen_random_uuid(),'${email}','${hash}',true,'VERIFIED') RETURNING id),
    p AS (INSERT INTO identity.user_profiles (id,user_id,user_type,first_name,last_name) SELECT gen_random_uuid(),id,'student','Test','${email.split("@")[0]}' FROM u RETURNING user_id) SELECT id FROM u;`);
  return id.split("\n")[0];
}

async function main() {
  const stamp = Date.now();
  const memberEmail = `membre.${stamp}@sep.test`;
  const member2Email = `membre2.${stamp}@sep.test`;
  const memberId = createMember(memberEmail);
  const member2Id = createMember(member2Email);

  try {
    const emb = await login(EMBASSY_ADMIN.email, EMBASSY_ADMIN.password);
    const com = await login(COMMUNITY_ADMIN.email, COMMUNITY_ADMIN.password);
    const mem = await login(memberEmail, PASSWORD);
    const agentIds = sql("SELECT user_id FROM identity.agents").split("\n").filter(Boolean);
    const agentEmails = sql("SELECT u.email FROM identity.agents a JOIN identity.users u ON u.id=a.user_id").split("\n").filter(Boolean);

    // ── A. L'ambassade ne voit plus les journaux communautaires ─────────────────────────────
    section("A. Journal d'audit côté ambassade");
    const communityIds = new Set(sql("SELECT id FROM audit.audit_logs WHERE domain='COMMUNITY'").split("\n").filter(Boolean));
    const embassyTotal = Number(sql("SELECT count(*) FROM audit.audit_logs WHERE domain='EMBASSY'"));
    const list = await call("GET", "/audit/logs?limit=200", emb.token);
    ok(list.status === 200, "l'admin ambassade lit /audit/logs", list.status);
    const ids = (list.json?.data ?? []).map((l) => l.id);
    ok(ids.length > 0 && ids.every((id) => !communityIds.has(id)), "aucune ligne COMMUNITY dans la liste ambassade", ids.filter((i) => communityIds.has(i)).slice(0, 3));
    ok(list.json?.meta?.total === embassyTotal, "le total de la pagination = lignes EMBASSY", [list.json?.meta?.total, embassyTotal]);
    const anyCommunityId = [...communityIds][0];
    const detail = await call("GET", `/audit/logs/${anyCommunityId}`, emb.token);
    ok(detail.status === 404, "le détail d'une ligne COMMUNITY est introuvable côté ambassade", detail.status);
    const stats = await call("GET", "/audit/stats", emb.token);
    ok(stats.json?.data?.total === embassyTotal, "les statistiques ambassade ne comptent que EMBASSY", [stats.json?.data?.total, embassyTotal]);
    const exp = await fetch(BASE + "/audit/export", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${emb.token}` }, body: JSON.stringify({ filters: {}, format: "CSV" }) });
    const csv = await exp.text();
    ok(exp.status === 200 && !csv.includes("@sep.test") && !csv.includes(memberEmail), "l'export CSV ambassade ne contient aucun membre", exp.status);
    const searchMember = await call("GET", `/audit/logs?search=${encodeURIComponent(memberEmail)}`, emb.token);
    ok((searchMember.json?.data ?? []).length === 0, "chercher un membre dans l'audit ambassade ne renvoie rien");

    // ── B. L'ambassade ne voit / n'attribue aucun rôle communautaire ────────────────────────
    section("B. Rôles et permissions côté ambassade");
    const roles = await call("GET", "/roles", emb.token);
    const roleNames = (roles.json?.data ?? roles.json ?? []).map((r) => r.name);
    ok(roleNames.includes("ADMIN") && !roleNames.some((n) => n.startsWith("COMMUNITY_")), "GET /roles : rôles ambassade seulement", roleNames);
    const perms = await call("GET", "/permissions", emb.token);
    const permCodes = (perms.json?.data ?? perms.json ?? []).map((p) => p.code);
    ok(permCodes.length > 0 && !permCodes.some((c) => c.startsWith("community:")), "GET /permissions : aucune permission community:*");
    const communityRoleId = sql("SELECT id FROM identity.roles WHERE name='COMMUNITY_ADMIN'");
    const assign = await call("POST", `/users/${memberId}/roles`, emb.token, { roleId: communityRoleId });
    ok(assign.status === 404, "l'admin ambassade ne peut pas attribuer COMMUNITY_ADMIN", assign.status);
    const role = await call("GET", `/roles/${communityRoleId}`, emb.token);
    ok(role.status === 404, "GET /roles/:id d'un rôle communautaire est introuvable côté ambassade", role.status);
    const addPerm = await call("POST", `/roles/${sql("SELECT id FROM identity.roles WHERE name='AGENT'")}/permissions`, emb.token, { permissionCode: "community:user:read" });
    ok(addPerm.status === 404, "impossible d'ajouter une permission communautaire à un rôle ambassade", addPerm.status);
    const embAgents = await call("GET", "/agents", emb.token);
    ok(embAgents.status === 200 && (embAgents.json?.data ?? []).length >= 1, "non-régression : l'admin ambassade liste toujours ses agents", embAgents.status);
    const mkAgent = await call("POST", "/agents", emb.token, { email: `agent.${stamp}@sep.test`, firstName: "T", lastName: "T", matricule: `SEP-${stamp}`, department: "ADMINISTRATIVE", roleId: communityRoleId });
    ok(mkAgent.status === 404 && sql(`SELECT count(*) FROM identity.users WHERE email='agent.${stamp}@sep.test'`) === "0", "impossible de créer un agent avec un rôle communautaire (rien n'est créé)", mkAgent.status);
    const embAdmin = emb.user;
    ok(!(embAdmin.permissions ?? []).some((c) => c.startsWith("community:")), "le jeton de l'admin ambassade ne porte aucune permission community:*");

    // ── C. Contrôle d'accès de l'espace d'administration communautaire ──────────────────────
    section("C. Accès à /api/communaute/admin/*");
    const A = "/api/communaute/admin";
    for (const [who, tok] of [["admin ambassade", emb.token], ["citoyen", mem.token]]) {
      for (const p of ["/overview", "/members", "/audit/logs", "/support/tickets", "/system"]) {
        const r = await call("GET", A + p, tok);
        ok(r.status === 403, `${who} → ${p} refusé`, r.status);
      }
    }
    const noAuth = await call("GET", A + "/overview", null);
    ok(noAuth.status === 401, "sans jeton → 401", noAuth.status);
    const ov = await call("GET", A + "/overview", com.token);
    ok(ov.status === 200 && typeof ov.json?.data?.members?.total === "number", "admin communauté → overview", ov.status);
    const sys = await call("GET", A + "/system", com.token);
    ok(sys.status === 200 && sys.json?.data?.components?.database?.ok === true && sys.json?.data?.components?.redis?.ok === true, "supervision système : base et redis OK", sys.json?.data?.components);

    // ── D. L'admin communauté ne voit pas l'ambassade ───────────────────────────────────────
    section("D. L'administration communautaire n'a aucun accès à l'ambassade");
    for (const p of ["/audit/logs", "/audit/stats", "/agents", "/support-tickets", "/etudiants", "/demandes"]) {
      const r = await call("GET", p, com.token);
      ok(r.status === 403 || r.status === 401, `admin communauté → ${p} refusé`, r.status);
    }
    const members = await call("GET", `${A}/members?limit=100&search=${encodeURIComponent("@")}`, com.token);
    const memberEmails = (members.json?.data ?? []).map((m) => m.email);
    ok(members.status === 200 && memberEmails.includes(memberEmail), "la liste des membres contient le citoyen de test", members.status);
    ok(!memberEmails.some((e) => agentEmails.includes(e)), "la liste des membres ne contient aucun agent de l'ambassade");
    ok(!memberEmails.includes(COMMUNITY_ADMIN.email), "la liste des membres ne contient pas l'équipe d'administration");
    const agentDetail = await call("GET", `${A}/members/${agentIds[0]}`, com.token);
    ok(agentDetail.status === 404, "le détail d'un agent est introuvable côté communauté", agentDetail.status);
    const memberDetail = await call("GET", `${A}/members/${memberId}`, com.token);
    ok(memberDetail.status === 200 && memberDetail.json?.data?.email === memberEmail && !("passwordHash" in (memberDetail.json?.data ?? {})), "détail d'un membre (sans secret)", memberDetail.status);

    const commLogs = await call("GET", `${A}/audit/logs?limit=200`, com.token);
    const cIds = (commLogs.json?.data ?? []).map((l) => l.id);
    const embassyIds = new Set(sql("SELECT id FROM audit.audit_logs WHERE domain='EMBASSY'").split("\n").filter(Boolean));
    ok(commLogs.status === 200 && cIds.length > 0 && cIds.every((id) => !embassyIds.has(id)), "le journal communauté ne contient aucune ligne EMBASSY", cIds.filter((i) => embassyIds.has(i)).slice(0, 3));
    const embLogId = [...embassyIds][0];
    const crossDetail = await call("GET", `${A}/audit/logs/${embLogId}`, com.token);
    ok(crossDetail.status === 404, "le détail d'une ligne EMBASSY est introuvable côté communauté", crossDetail.status);
    const adminRows = (commLogs.json?.data ?? []).filter((l) => agentEmails.includes(l.actorEmail));
    ok(adminRows.length === 0, "aucun acteur agent dans le journal communauté");

    // ── E. Classement à l'écriture ──────────────────────────────────────────────────────────
    section("E. Domaine fixé à l'écriture");
    const lastLogins = sql(`SELECT u.email||'='||l.domain FROM audit.audit_logs l JOIN identity.users u ON u.id=l.actor_user_id WHERE l.action='LOGIN' AND l.at > now() - interval '10 minutes' ORDER BY l.at DESC`).split("\n");
    ok(lastLogins.includes(`${EMBASSY_ADMIN.email}=EMBASSY`), "login admin ambassade → EMBASSY", lastLogins);
    ok(lastLogins.includes(`${COMMUNITY_ADMIN.email}=COMMUNITY`), "login admin communauté → COMMUNITY", lastLogins);
    ok(lastLogins.includes(`${memberEmail}=COMMUNITY`), "login citoyen → COMMUNITY", lastLogins);
    await call("POST", "/auth/login", null, { email: `inconnu.${stamp}@sep.test`, password: "xxxxxxxxxxxx" }, { "X-Client-App": "community" });
    await call("POST", "/auth/login", null, { email: `inconnu2.${stamp}@sep.test`, password: "xxxxxxxxxxxx" });
    const unk = sql(`SELECT entity_id||'='||domain FROM audit.audit_logs WHERE action='LOGIN_ATTEMPT' AND entity_id LIKE '%${stamp}@sep.test'`).split("\n");
    ok(unk.includes(`inconnu.${stamp}@sep.test=COMMUNITY`) && unk.includes(`inconnu2.${stamp}@sep.test=EMBASSY`), "email inconnu classé selon X-Client-App", unk);

    // ── F. Support à deux destinataires ─────────────────────────────────────────────────────
    section("F. Support : ambassade / communauté");
    const tComm = await call("POST", "/api/communaute/support", mem.token, { target: "COMMUNITY", category: "REPORT", subject: "Signalement test séparation", message: "Message de test pour le support communauté." });
    const tEmb = await call("POST", "/api/communaute/support", mem.token, { target: "EMBASSY", category: "DEMANDE", subject: "Question ambassade test", message: "Message de test pour l'ambassade, dossier." });
    const tBad = await call("POST", "/api/communaute/support", mem.token, { target: "COMMUNITY", category: "DEMANDE", subject: "Catégorie interdite", message: "Une demande de dossier ne va pas au support communauté." });
    const tDefault = await call("POST", "/api/communaute/support", mem.token, { category: "OTHER", subject: "Sans destinataire explicite", message: "Doit aller à l'ambassade par défaut." });
    ok(tComm.status === 201 && tEmb.status === 201, "création d'un ticket par destinataire", [tComm.status, tEmb.status]);
    ok(tBad.status === 422 || tBad.status === 400, "catégorie DEMANDE refusée pour la communauté", tBad.status);
    ok(tDefault.status === 201, "sans destinataire → ambassade", tDefault.status);
    const commTicketId = tComm.json?.data?.id;
    const embTicketId = tEmb.json?.data?.id;
    const embList = await call("GET", "/support-tickets?limit=100", emb.token);
    const embRefs = (embList.json?.data ?? []).map((t) => t.id);
    ok(embRefs.includes(embTicketId) && !embRefs.includes(commTicketId), "l'ambassade ne voit que ses tickets", embList.status);
    ok((embList.json?.data ?? []).every((t) => t.target === "EMBASSY"), "tous les tickets ambassade ont target=EMBASSY");
    const embOpenComm = await call("GET", `/support-tickets/${commTicketId}`, emb.token);
    ok(embOpenComm.status === 404, "l'ambassade ne peut pas ouvrir un ticket communauté", embOpenComm.status);
    const embReplyComm = await call("POST", `/support-tickets/${commTicketId}/messages`, emb.token, { content: "intrusion" });
    ok(embReplyComm.status === 404, "l'ambassade ne peut pas répondre à un ticket communauté", embReplyComm.status);
    const comList = await call("GET", `${A}/support/tickets?limit=100`, com.token);
    const comRefs = (comList.json?.data ?? []).map((t) => t.id);
    ok(comRefs.includes(commTicketId) && !comRefs.includes(embTicketId), "la communauté ne voit que ses tickets", comList.status);
    const comOpenEmb = await call("GET", `${A}/support/tickets/${embTicketId}`, com.token);
    ok(comOpenEmb.status === 404, "la communauté ne peut pas ouvrir un ticket ambassade", comOpenEmb.status);
    const reply = await call("POST", `${A}/support/tickets/${commTicketId}/messages`, com.token, { content: "Bonjour, nous regardons votre signalement." });
    ok(reply.status === 201, "l'admin communauté répond", reply.status);
    const mine = await call("GET", `/api/communaute/support/tickets/${commTicketId}`, mem.token);
    const staffMsg = (mine.json?.data?.messages ?? []).find((m) => m.authorType === "STAFF");
    ok(staffMsg?.authorName === "Support Poramma Communauté" && mine.json?.data?.target === "COMMUNITY", "le membre voit « Support Poramma Communauté »", staffMsg);
    const upd = await call("PATCH", `${A}/support/tickets/${commTicketId}`, com.token, { status: "IN_PROGRESS" });
    ok(upd.status === 200 && upd.json?.data?.status === "IN_PROGRESS", "changement de statut par la communauté", upd.status);
    const notif = sql(`SELECT count(*) FROM ambassade.notifications WHERE user_id='${com.user.id}' AND action_url LIKE '/admin/support/%'`);
    ok(Number(notif) >= 1, "l'équipe communauté est notifiée avec un lien /admin/support/…", notif);

    // ── G. Suspension d'un membre ───────────────────────────────────────────────────────────
    section("G. Suspension d'un membre");
    const susAgent = await call("PATCH", `/community-admin/members/${agentIds[0]}/status`, com.token, { status: "SUSPENDED" });
    ok(susAgent.status === 404, "impossible de suspendre un agent via l'admin communauté", susAgent.status);
    const susSelf = await call("PATCH", `/community-admin/members/${com.user.id}/status`, com.token, { status: "SUSPENDED" });
    ok(susSelf.status === 403, "impossible de se suspendre soi-même", susSelf.status);
    const susEmb = await call("PATCH", `/community-admin/members/${memberId}/status`, emb.token, { status: "SUSPENDED" });
    ok(susEmb.status === 403, "l'admin ambassade ne peut pas suspendre un membre via cette route", susEmb.status);
    const sus = await call("PATCH", `/community-admin/members/${memberId}/status`, com.token, { status: "SUSPENDED", reason: "test" });
    ok(sus.status === 200, "suspension d'un membre", sus.status);
    const afterSus = await call("GET", "/api/communaute/support/tickets", mem.token);
    ok(afterSus.status === 401, "la session du membre suspendu est coupée immédiatement", afterSus.status);
    const reLogin = await call("POST", "/auth/login", null, { email: memberEmail, password: PASSWORD });
    ok(reLogin.status === 401, "le membre suspendu ne peut plus se connecter", reLogin.status);
    const react = await call("PATCH", `/community-admin/members/${memberId}/status`, com.token, { status: "ACTIVE" });
    ok(react.status === 200, "réactivation", react.status);
    const again = await call("POST", "/auth/login", null, { email: memberEmail, password: PASSWORD });
    ok(again.status === 200, "le membre réactivé se reconnecte", again.status);
    const susRows = sql(`SELECT action||'='||domain FROM audit.audit_logs WHERE entity_id='${memberId}' AND action IN ('SUSPEND','REACTIVATE')`).split("\n");
    ok(susRows.includes("SUSPEND=COMMUNITY") && susRows.includes("REACTIVATE=COMMUNITY"), "suspension/réactivation tracées côté COMMUNITY", susRows);

    // ── H. Équipe d'administration ──────────────────────────────────────────────────────────
    section("H. Équipe d'administration communautaire");
    const teamEmb = await call("GET", "/community-admin/team", emb.token);
    ok(teamEmb.status === 403, "l'admin ambassade ne voit pas l'équipe communautaire", teamEmb.status);
    const addAgent = await call("POST", "/community-admin/team", com.token, { email: EMBASSY_ADMIN.email, role: "COMMUNITY_ADMIN" });
    ok(addAgent.status === 404, "un agent de l'ambassade ne peut pas rejoindre l'équipe communautaire", addAgent.status);
    const add = await call("POST", "/community-admin/team", com.token, { email: member2Email, role: "COMMUNITY_SUPPORT" });
    ok(add.status === 201, "ajout d'un membre comme COMMUNITY_SUPPORT", add.status);
    const sup = await login(member2Email, PASSWORD);
    ok((sup.user.permissions ?? []).includes("community:support:manage") && !(sup.user.permissions ?? []).includes("community:team:manage"), "le support a seulement ses permissions");
    const supTeam = await call("GET", "/community-admin/team", sup.token);
    ok(supTeam.status === 403, "le support ne gère pas l'équipe", supTeam.status);
    const supAudit = await call("GET", `${A}/audit/logs`, sup.token);
    ok(supAudit.status === 403, "le support ne lit pas le journal d'audit", supAudit.status);
    const supTickets = await call("GET", `${A}/support/tickets`, sup.token);
    ok(supTickets.status === 200, "le support lit les tickets", supTickets.status);
    const team = await call("GET", "/community-admin/team", com.token);
    ok((team.json?.data ?? []).some((m) => m.email === member2Email && m.role === "COMMUNITY_SUPPORT"), "l'équipe liste le nouveau membre");
    const rmSelf = await call("DELETE", `/community-admin/team/${com.user.id}`, com.token);
    ok(rmSelf.status === 403, "on ne peut pas se retirer soi-même", rmSelf.status);
    const members2 = await call("GET", `${A}/members?limit=100&search=${encodeURIComponent(member2Email)}`, com.token);
    ok((members2.json?.data ?? []).length === 0, "un membre de l'équipe disparaît de la liste des membres");
    const chg = await call("PATCH", `/community-admin/team/${member2Id}`, com.token, { role: "COMMUNITY_ADMIN" });
    ok(chg.status === 200, "changement de rôle", chg.status);
    const oldTok = await call("GET", `${A}/overview`, sup.token);
    ok(oldTok.status === 401, "l'ancien jeton est révoqué après changement de rôle", oldTok.status);
    const rm = await call("DELETE", `/community-admin/team/${member2Id}`, com.token);
    ok(rm.status === 200, "retrait de l'équipe", rm.status);
    const backMember = await call("GET", `${A}/members/${member2Id}`, com.token);
    ok(backMember.status === 200, "la personne redevient un membre", backMember.status);
  } finally {
    // Nettoyage : comptes de test et leurs traces (jamais de compte existant).
    try {
      sql(`DELETE FROM ambassade.support_ticket_messages WHERE ticket_id IN (SELECT id FROM ambassade.support_tickets WHERE user_id IN ('${memberId}','${member2Id}'));
           DELETE FROM ambassade.support_tickets WHERE user_id IN ('${memberId}','${member2Id}');
           DELETE FROM ambassade.notifications WHERE user_id IN ('${memberId}','${member2Id}');
           DELETE FROM audit.audit_logs WHERE actor_user_id IN ('${memberId}','${member2Id}') OR entity_id IN ('${memberId}','${member2Id}') OR entity_id LIKE '%${stamp}@sep.test';
           DELETE FROM identity.sessions WHERE user_id IN ('${memberId}','${member2Id}');
           DELETE FROM identity.user_roles WHERE user_id IN ('${memberId}','${member2Id}');
           DELETE FROM identity.user_profiles WHERE user_id IN ('${memberId}','${member2Id}');
           DELETE FROM identity.users WHERE id IN ('${memberId}','${member2Id}');`);
    } catch (e) {
      console.log("\n(nettoyage partiel : " + e.message.split("\n")[0] + ")");
    }
  }

  console.log(`\n${checks - failures}/${checks} vérifications réussies${failures ? ` — ${failures} ÉCHEC(S)` : ""}`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error("\nErreur du test :", e.message);
  process.exit(2);
});
