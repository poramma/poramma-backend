import { sql } from "drizzle-orm";
import { NotFoundError } from "@poramma/utils";
import { getRedisClient } from "@poramma/cache";
import { healthLogic } from "@poramma/ambassade-core";
import { db } from "../../db/connection";

/**
 * Administration de la plateforme communautaire : tout ce module ne parle que
 * des MEMBRES, c'est-à-dire des comptes qui n'ont ni fiche agent ni rôle actif.
 * Le personnel de l'ambassade (agents) et l'équipe d'administration
 * communautaire (rôles COMMUNITY_*) n'en font pas partie : un identifiant
 * d'agent passé à ces fonctions est « introuvable ». Lecture seule sur
 * identity.* (propriété exclusive d'identity-api — les écritures passent par
 * identity-api, voir modules/community-admin).
 */

const MEMBERS = sql`
  SELECT u.* FROM identity.users u
  WHERE NOT EXISTS (SELECT 1 FROM identity.agents a WHERE a.user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM identity.user_roles ur WHERE ur.user_id = u.id AND COALESCE(ur.is_active, true))
`;

const rowsOf = <T = Record<string, any>>(res: any): T[] => (res?.rows ?? res) as T[];

// ── Tableau de bord ──────────────────────────────────────────────────────

export async function overview() {
  const [members, byType, byRegistration, activity, dailyRegistrations, dailyLogins, support] = await Promise.all([
    db.execute(sql`
      WITH m AS (${MEMBERS})
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE status = 'SUSPENDED')::int AS suspended,
        count(*) FILTER (WHERE status = 'VERIFIED')::int AS verified,
        count(*) FILTER (WHERE status IS DISTINCT FROM 'VERIFIED' AND status IS DISTINCT FROM 'SUSPENDED')::int AS unverified,
        count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS new7,
        count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS new30
      FROM m`),
    db.execute(sql`
      WITH m AS (${MEMBERS})
      SELECT COALESCE(p.user_type, 'other') AS k, count(*)::int AS n
      FROM m LEFT JOIN identity.user_profiles p ON p.user_id = m.id GROUP BY 1`),
    db.execute(sql`
      WITH m AS (${MEMBERS})
      SELECT COALESCE(e.status, 'NONE') AS k, count(*)::int AS n
      FROM m LEFT JOIN ambassade.etudiants e ON e.user_id = m.id GROUP BY 1`),
    db.execute(sql`
      SELECT
        count(*) FILTER (WHERE action = 'LOGIN')::int AS logins24,
        count(*) FILTER (WHERE action = 'LOGIN_ATTEMPT' AND result = 'REJECT')::int AS failed24,
        count(*) FILTER (WHERE severity = 'CRITICAL')::int AS critical24,
        count(DISTINCT actor_user_id) FILTER (WHERE action = 'LOGIN')::int AS activeMembers24
      FROM audit.audit_logs WHERE domain = 'COMMUNITY' AND at >= now() - interval '24 hours'`),
    db.execute(sql`
      WITH m AS (${MEMBERS})
      SELECT to_char(d::date, 'YYYY-MM-DD') AS day, count(m.id)::int AS n
      FROM generate_series(current_date - 13, current_date, interval '1 day') d
      LEFT JOIN m ON m.created_at::date = d::date GROUP BY d ORDER BY d`),
    db.execute(sql`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS day, count(l.id)::int AS n
      FROM generate_series(current_date - 13, current_date, interval '1 day') d
      LEFT JOIN audit.audit_logs l ON l.domain = 'COMMUNITY' AND l.action = 'LOGIN' AND l.at::date = d::date GROUP BY d ORDER BY d`),
    db.execute(sql`
      SELECT
        count(*) FILTER (WHERE status = 'OPEN')::int AS open,
        count(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS "inProgress",
        count(*) FILTER (WHERE status = 'WAITING_USER')::int AS "waitingUser",
        count(*) FILTER (WHERE assigned_to IS NULL AND status IN ('OPEN','IN_PROGRESS','WAITING_USER'))::int AS unassigned
      FROM ambassade.support_tickets WHERE target = 'COMMUNITY'`),
  ]);

  const toMap = (res: any) => Object.fromEntries(rowsOf<{ k: string; n: number }>(res).map((r) => [r.k, r.n]));
  const a = rowsOf(activity)[0] ?? {};
  return {
    members: rowsOf(members)[0],
    byUserType: toMap(byType),
    byRegistration: toMap(byRegistration),
    activity: {
      logins24h: a.logins24 ?? 0,
      failedLogins24h: a.failed24 ?? 0,
      criticalEvents24h: a.critical24 ?? 0,
      activeMembers24h: a.activemembers24 ?? 0,
    },
    series: { registrations: rowsOf(dailyRegistrations), logins: rowsOf(dailyLogins) },
    support: rowsOf(support)[0],
  };
}

// ── Membres ──────────────────────────────────────────────────────────────

export interface MemberFilters {
  search?: string;
  status?: string; // VERIFIED | UNVERIFIED | SUSPENDED
  userType?: string; // student | worker | other
  registration?: string; // PENDING | VALIDATED | REJECTED | SUSPENDED | NONE
  page: number;
  limit: number;
}

export async function listMembers(f: MemberFilters) {
  const conds = [sql`true`];
  if (f.status === "UNVERIFIED") conds.push(sql`(m.status IS DISTINCT FROM 'VERIFIED' AND m.status IS DISTINCT FROM 'SUSPENDED')`);
  else if (f.status) conds.push(sql`m.status = ${f.status}`);
  if (f.userType) conds.push(sql`COALESCE(p.user_type, 'other') = ${f.userType}`);
  if (f.registration === "NONE") conds.push(sql`e.id IS NULL`);
  else if (f.registration) conds.push(sql`e.status = ${f.registration}`);
  if (f.search?.trim()) {
    const s = `%${f.search.trim()}%`;
    conds.push(sql`(m.email ILIKE ${s} OR m.phone ILIKE ${s} OR p.first_name ILIKE ${s} OR p.last_name ILIKE ${s} OR p.inue ILIKE ${s} OR e.inue ILIKE ${s})`);
  }
  const where = sql.join(conds, sql` AND `);
  const from = sql`FROM (${MEMBERS}) m
    LEFT JOIN identity.user_profiles p ON p.user_id = m.id
    LEFT JOIN ambassade.etudiants e ON e.user_id = m.id`;

  const [rows, count] = await Promise.all([
    db.execute(sql`
      SELECT m.id, m.email, m.phone, m.status, m.created_at AS "createdAt",
        p.first_name AS "firstName", p.last_name AS "lastName", COALESCE(p.user_type, 'other') AS "userType",
        p.city, p.country, COALESCE(e.inue, p.inue) AS inue, e.status AS "registrationStatus",
        (SELECT max(l.at) FROM audit.audit_logs l WHERE l.actor_user_id = m.id AND l.action = 'LOGIN') AS "lastLoginAt"
      ${from} WHERE ${where}
      ORDER BY m.created_at DESC NULLS LAST
      LIMIT ${f.limit} OFFSET ${(f.page - 1) * f.limit}`),
    db.execute(sql`SELECT count(*)::int AS total ${from} WHERE ${where}`),
  ]);
  return { data: rowsOf(rows), total: rowsOf<{ total: number }>(count)[0]?.total ?? 0 };
}

export async function getMember(id: string) {
  const [member] = rowsOf(
    await db.execute(sql`
      SELECT m.id, m.email, m.phone, m.status, m.email_verified AS "emailVerified", m.phone_verified AS "phoneVerified",
        m.created_at AS "createdAt", m.updated_at AS "updatedAt",
        p.first_name AS "firstName", p.last_name AS "lastName", COALESCE(p.user_type, 'other') AS "userType",
        p.birth_date AS "birthDate", p.nationality, p.address, p.city, p.country, p.gender,
        e.status AS "registrationStatus", COALESCE(e.inue, p.inue) AS inue, e.submitted_at AS "submittedAt"
      FROM (${MEMBERS}) m
      LEFT JOIN identity.user_profiles p ON p.user_id = m.id
      LEFT JOIN ambassade.etudiants e ON e.user_id = m.id
      WHERE m.id = ${id}`)
  );
  if (!member) throw new NotFoundError("Membre introuvable");

  const [counts, sessions, recent] = await Promise.all([
    db.execute(sql`
      SELECT
        (SELECT count(*)::int FROM ambassade.demandes WHERE user_id = ${id}) AS demandes,
        (SELECT count(*)::int FROM ambassade.rendez_vous WHERE user_id = ${id}) AS "rendezVous",
        (SELECT count(*)::int FROM ambassade.support_tickets WHERE user_id = ${id}) AS tickets`),
    db.execute(sql`
      SELECT id, ip, user_agent AS "userAgent", remember_me AS "rememberMe", created_at AS "createdAt", revoked_at AS "revokedAt"
      FROM identity.sessions WHERE user_id = ${id} ORDER BY created_at DESC LIMIT 8`),
    db.execute(sql`
      SELECT id, at, action, entity_type AS "entityType", result, severity, ip
      FROM audit.audit_logs WHERE domain = 'COMMUNITY' AND actor_user_id = ${id} ORDER BY at DESC LIMIT 15`),
  ]);
  return { ...member, counts: rowsOf(counts)[0], sessions: rowsOf(sessions), recentActivity: rowsOf(recent) };
}

// ── Supervision système ──────────────────────────────────────────────────

/** État des composants dont dépend la plateforme. Jamais de message d'erreur brut ni de secret : des indicateurs seulement. */
export async function systemStatus() {
  const [database, redis, storage] = await Promise.all([
    healthLogic.probe(() => db.execute(sql`SELECT 1`)),
    healthLogic.probe(() => getRedisClient().ping()),
    healthLogic.checkStorage(),
  ]);
  const smtpHost = process.env.SMTP_HOST ?? "";
  const mem = process.memoryUsage();
  return {
    checkedAt: new Date().toISOString(),
    components: {
      database,
      redis,
      storage,
      // Un transport « mailhog » n'envoie rien dans la vraie boîte du destinataire : signalé comme non configuré.
      mail: { configured: !!smtpHost && smtpHost !== "mailhog", provider: smtpHost || null },
    },
    runtime: {
      service: "communaute-api",
      node: process.version,
      environment: process.env.NODE_ENV ?? "development",
      uptimeSeconds: Math.round(process.uptime()),
      memoryMb: Math.round(mem.rss / 1024 / 1024),
    },
  };
}
