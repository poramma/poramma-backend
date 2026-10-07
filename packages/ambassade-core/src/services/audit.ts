import crypto from "crypto";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql, SQL } from "drizzle-orm";
import { markAudited } from "@poramma/utils";
import type { Db } from "../db-type";
import { auditLogs } from "../schema/audit";
import { identityAgents, identityRoles, identityUserProfiles, identityUserRoles, identityUsers } from "../schema/identity";
import { getUsersByIds } from "./identity";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

interface Actor {
  userId: string;
  roleName: string | null;
}

/** Plateforme dont relève un acteur d'audit — voir schema/audit.ts (colonne `domain`). */
export type AuditDomain = "EMBASSY" | "COMMUNITY";

// ── Domaine de l'acteur ──────────────────────────────────────────────────

const DOMAIN_TTL_MS = 60_000;
const DOMAIN_CACHE_MAX = 5_000;
const domainCache = new Map<string, { domain: AuditDomain; expires: number }>();

/**
 * EMBASSY si le compte est du personnel de l'ambassade (fiche agent OU rôle
 * actif de portée EMBASSY), COMMUNITY sinon : membres de la communauté et
 * équipe d'administration communautaire. Un acteur inconnu (`null`) reçoit
 * `fallback` : l'appelant sait quelle plateforme a émis l'évènement.
 *
 * Le résultat est mis en cache 60 s : chaque requête authentifiée écrit une
 * ligne d'audit et ne doit pas coûter deux lectures de plus à chaque fois.
 */
export async function resolveDomain(db: Db, userId: string | null | undefined, fallback: AuditDomain = "EMBASSY"): Promise<AuditDomain> {
  if (!userId) return fallback;

  const hit = domainCache.get(userId);
  if (hit && hit.expires > Date.now()) return hit.domain;

  const [agent] = await db.select({ id: identityAgents.id }).from(identityAgents).where(eq(identityAgents.userId, userId)).limit(1);
  let domain: AuditDomain = agent ? "EMBASSY" : "COMMUNITY";
  if (!agent) {
    const [embassyRole] = await db
      .select({ id: identityUserRoles.id })
      .from(identityUserRoles)
      .innerJoin(identityRoles, eq(identityRoles.id, identityUserRoles.roleId))
      .where(and(eq(identityUserRoles.userId, userId), eq(identityUserRoles.isActive, true), eq(identityRoles.scope, "EMBASSY")))
      .limit(1);
    if (embassyRole) domain = "EMBASSY";
  }

  if (domainCache.size >= DOMAIN_CACHE_MAX) domainCache.clear();
  domainCache.set(userId, { domain, expires: Date.now() + DOMAIN_TTL_MS });
  return domain;
}

/**
 * Journal d'audit général, multi-entités — appelé par ambassade-api ET
 * communaute-api (RÈGLE-08 : toute mutation côté citoyen doit être auditée
 * aussi). identity-api garde sa propre copie locale (voir son
 * shared/audit-write.ts), même table, cross-schema write.
 */
export async function writeAudit(
  db: Db,
  params: {
    action: string;
    entityType: string;
    entityId: string;
    actor: Actor | null;
    result?: "SUCCESS" | "ERROR" | "REJECT" | "WARNING";
    severity?: "INFO" | "WARNING" | "CRITICAL";
    entitySnapshot?: Record<string, unknown> | null;
    details?: Record<string, unknown> | null;
    ip?: string | null;
    ua?: string | null;
    sessionId?: string | null;
    /** Forcer le domaine (sinon déduit de l'acteur). */
    domain?: AuditDomain;
    /** Passe la transaction active pour que l'audit soit atomique avec la mutation qu'il documente. */
    tx?: Pick<Db, "insert">;
  }
) {
  markAudited();
  const conn = params.tx ?? db;
  const domain = params.domain ?? (await resolveDomain(db, params.actor?.userId));
  await conn.insert(auditLogs).values({
    id: newId("aud"),
    actorUserId: params.actor?.userId ?? null,
    actorRole: params.actor?.roleName ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    entitySnapshot: params.entitySnapshot ?? null,
    result: params.result ?? "SUCCESS",
    details: params.details ?? null,
    ip: params.ip ?? null,
    ua: params.ua ?? null,
    sessionId: params.sessionId ?? null,
    severity: params.severity ?? "INFO",
    domain,
  });
}

// ── Lecture (administration de la plateforme) ────────────────────────────
//
// Une seule implémentation pour les deux administrations ; le `domain` est un
// paramètre OBLIGATOIRE de chaque fonction : il n'existe aucun moyen de lire
// le journal sans choisir (et donc se limiter à) une plateforme.

export interface AuditFilters {
  actorUserId?: string;
  actorRole?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  result?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/** "2026-09-19" comme borne haute = fin de CETTE journée (sinon minuit et tout le jour est exclu). */
function endOfRange(dateTo: string): Date {
  const d = new Date(dateTo);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) d.setUTCHours(23, 59, 59, 999);
  return d;
}

function buildConditions(db: Db, domain: AuditDomain, filters: AuditFilters): SQL[] {
  const conditions: SQL[] = [eq(auditLogs.domain, domain)];
  if (filters.actorUserId) conditions.push(eq(auditLogs.actorUserId, filters.actorUserId));
  if (filters.actorRole) conditions.push(eq(auditLogs.actorRole, filters.actorRole));
  if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
  if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
  if (filters.entityId) conditions.push(eq(auditLogs.entityId, filters.entityId));
  if (filters.result) conditions.push(eq(auditLogs.result, filters.result));
  if (filters.severity) conditions.push(eq(auditLogs.severity, filters.severity));
  if (filters.dateFrom) conditions.push(gte(auditLogs.at, new Date(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lte(auditLogs.at, endOfRange(filters.dateTo)));
  if (filters.search) {
    const s = `%${filters.search.trim()}%`;
    // Recherche aussi par email / nom de la personne qui a agi (sous-requête sur identity.*).
    const actorIds = db
      .select({ id: identityUsers.id })
      .from(identityUsers)
      .leftJoin(identityUserProfiles, eq(identityUserProfiles.userId, identityUsers.id))
      .where(or(ilike(identityUsers.email, s), ilike(identityUserProfiles.firstName, s), ilike(identityUserProfiles.lastName, s)));
    conditions.push(
      or(
        ilike(auditLogs.action, s),
        ilike(auditLogs.entityType, s),
        ilike(auditLogs.entityId, s),
        ilike(auditLogs.actorRole, s),
        inArray(auditLogs.actorUserId, actorIds)
      )!
    );
  }
  return conditions;
}

type AuditUsers = Awaited<ReturnType<typeof getUsersByIds>>;

function toView(row: typeof auditLogs.$inferSelect, users: AuditUsers) {
  const user = row.actorUserId ? users.get(row.actorUserId) : undefined;
  return {
    id: row.id,
    at: row.at,
    actorUserId: row.actorUserId,
    actorEmail: user?.email ?? null,
    actorInue: user?.profile?.inue ?? null,
    actorName: user?.profile ? [user.profile.firstName, user.profile.lastName].filter(Boolean).join(" ") || null : null,
    actorRole: row.actorRole ?? "UNKNOWN",
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    entitySnapshot: row.entitySnapshot,
    result: row.result,
    details: row.details,
    ip: row.ip,
    ua: row.ua,
    sessionId: row.sessionId,
    severity: row.severity,
  };
}

/** Enrichit un lot de lignes avec les acteurs en 3 requêtes (et non une par ligne). */
export async function enrichLogs(db: Db, rows: (typeof auditLogs.$inferSelect)[]) {
  const users = await getUsersByIds(
    db,
    rows.map((r) => r.actorUserId).filter((id): id is string => !!id)
  );
  return rows.map((r) => toView(r, users));
}

/** Liste paginée du journal d'UNE plateforme : `data` (la page) et `total` (pour la pagination). */
export async function listLogs(db: Db, domain: AuditDomain, filters: AuditFilters) {
  const where = and(...buildConditions(db, domain, filters));
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 25;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.at))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: sql<number>`count(*)::int` }).from(auditLogs).where(where),
  ]);

  return { data: await enrichLogs(db, rows), total, page, limit };
}

/** Une ligne du journal — introuvable (null) si elle appartient à l'autre plateforme. */
export async function getLog(db: Db, domain: AuditDomain, id: string) {
  const [row] = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.id, id), eq(auditLogs.domain, domain)));
  if (!row) return null;
  return (await enrichLogs(db, [row]))[0];
}

/** Statistiques sur l'ensemble du journal d'une plateforme (agrégats SQL). */
export async function getStats(db: Db, domain: AuditDomain) {
  const inDomain = eq(auditLogs.domain, domain);
  const [sev, res, [failed]] = await Promise.all([
    db.select({ k: auditLogs.severity, n: sql<number>`count(*)::int` }).from(auditLogs).where(inDomain).groupBy(auditLogs.severity),
    db.select({ k: auditLogs.result, n: sql<number>`count(*)::int` }).from(auditLogs).where(inDomain).groupBy(auditLogs.result),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(and(inDomain, eq(auditLogs.action, "LOGIN_ATTEMPT"), eq(auditLogs.result, "REJECT"))),
  ]);

  const bySeverity: Record<string, number> = { INFO: 0, WARNING: 0, CRITICAL: 0 };
  const byResult: Record<string, number> = { SUCCESS: 0, ERROR: 0, REJECT: 0, WARNING: 0 };
  for (const r of sev) bySeverity[r.k] = r.n;
  for (const r of res) byResult[r.k] = r.n;

  return {
    total: Object.values(bySeverity).reduce((a, b) => a + b, 0),
    bySeverity,
    byResult,
    failedLogins: failed?.n ?? 0,
    criticalEvents: bySeverity.CRITICAL,
  };
}

export async function exportLogsAsCsv(db: Db, domain: AuditDomain, filters: AuditFilters): Promise<string> {
  const { data: logs } = await listLogs(db, domain, { ...filters, page: 1, limit: 5000 });
  const header = ["date_heure", "acteur", "email", "role", "action", "entite", "identifiant", "resultat", "severite", "ip"].join(",");
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = logs.map((l) =>
    [new Date(l.at as Date).toISOString(), l.actorName ?? "", l.actorEmail ?? "", l.actorRole, l.action, l.entityType, l.entityId, l.result, l.severity, l.ip ?? ""]
      .map(escape)
      .join(",")
  );
  return [header, ...rows].join("\n");
}
