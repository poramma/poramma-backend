import { eq, and, gte, lte, desc, ilike, or, inArray, sql, SQL } from "drizzle-orm";
import { db } from "../../db/connection";
import { auditLogs } from "../../db/schema.audit";
import { demandes } from "../../db/schema.demandes";
import { rendezVous } from "../../db/schema.rendezvous";
import { etudiants } from "../../db/schema.etudiants";
import { auditLogic, identityLogic, identitySchema } from "@poramma/ambassade-core";
import { paginationMeta } from "@poramma/dto";

interface Actor {
  userId: string;
  roleName: string | null;
}

/**
 * Journal d'audit général, multi-entités (LOGIN, DEMANDE, RENDEZ_VOUS,
 * SERVICE_SCHEDULE, CAMPAGNE, ROLE, AGENT, ...) — distinct du journal
 * documentaire (documents.service.ts's writeAudit). Logique déplacée dans
 * @poramma/ambassade-core (partagée avec communaute-api, RÈGLE-08) ; ce
 * wrapper ne fait que lier le pool de connexion local.
 */
export async function writeAudit(params: {
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
  /** Passe la transaction active (ex: db.transaction(async (tx) => ...)) pour que l'audit soit atomique avec la mutation qu'il documente — voir modules/inue. */
  tx?: Pick<typeof db, "insert">;
}) {
  return auditLogic.writeAudit(db, params);
}

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

const { identityUsers, identityUserProfiles } = identitySchema;

/** "2026-09-19" comme borne haute = fin de CETTE journée (sinon minuit et tout le jour est exclu). */
function endOfRange(dateTo: string): Date {
  const d = new Date(dateTo);
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) d.setUTCHours(23, 59, 59, 999);
  return d;
}

function buildConditions(filters: AuditFilters): SQL[] {
  const conditions: SQL[] = [];
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

type AuditUsers = Awaited<ReturnType<typeof identityLogic.getUsersByIds>>;

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
export async function enrichLogs(rows: (typeof auditLogs.$inferSelect)[]) {
  const users = await identityLogic.getUsersByIds(
    db,
    rows.map((r) => r.actorUserId).filter((id): id is string => !!id)
  );
  return rows.map((r) => toView(r, users));
}

export async function enrichLog(row: typeof auditLogs.$inferSelect) {
  return (await enrichLogs([row]))[0];
}

/** Liste paginée : `data` (la page demandée) et `meta` (total, pages) pour l'affichage paginé. */
export async function listLogs(filters: AuditFilters) {
  const conditions = buildConditions(filters);
  const where = conditions.length ? and(...conditions) : undefined;
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

  return {
    data: await enrichLogs(rows),
    meta: paginationMeta(page, limit, total),
  };
}

export async function getLog(id: string) {
  const [row] = await db.select().from(auditLogs).where(eq(auditLogs.id, id));
  if (!row) return null;
  return enrichLog(row);
}

/** Statistiques sur l'ensemble du journal (agrégats SQL — plus limitées aux 2000 dernières lignes). */
export async function getStats() {
  const [sev, res, [failed]] = await Promise.all([
    db.select({ k: auditLogs.severity, n: sql<number>`count(*)::int` }).from(auditLogs).groupBy(auditLogs.severity),
    db.select({ k: auditLogs.result, n: sql<number>`count(*)::int` }).from(auditLogs).groupBy(auditLogs.result),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(and(eq(auditLogs.action, "LOGIN_ATTEMPT"), eq(auditLogs.result, "REJECT"))),
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

export async function exportLogsAsCsv(filters: AuditFilters): Promise<string> {
  const { data: logs } = await listLogs({ ...filters, page: 1, limit: 5000 });
  const header = ["date_heure", "acteur", "email", "role", "action", "entite", "identifiant", "resultat", "severite", "ip"].join(",");
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = logs.map((l) =>
    [new Date(l.at as Date).toISOString(), l.actorName ?? "", l.actorEmail ?? "", l.actorRole, l.action, l.entityType, l.entityId, l.result, l.severity, l.ip ?? ""]
      .map(escape)
      .join(",")
  );
  return [header, ...rows].join("\n");
}

/**
 * Activité personnelle d'un agent (« ce que j'ai fait ») : ses propres lignes du
 * journal, paginées, avec un libellé lisible de l'objet concerné (numéro de
 * dossier, ticket de rendez-vous, nom de l'étudiant…) plutôt qu'un identifiant.
 */
export async function listMyActivity(userId: string, opts: { page?: number; limit?: number }) {
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const where = eq(auditLogs.actorUserId, userId);

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

  const idsOf = (type: string) => [...new Set(rows.filter((r) => r.entityType === type && r.entityId !== "-").map((r) => r.entityId))];
  const demandeIds = idsOf("DEMANDE");
  const rdvIds = idsOf("RENDEZ_VOUS");
  const etudiantIds = idsOf("ETUDIANT");

  const [demandeRows, rdvRows, etuRows] = await Promise.all([
    demandeIds.length ? db.select({ id: demandes.id, label: demandes.dossierNumber }).from(demandes).where(inArray(demandes.id, demandeIds)) : [],
    rdvIds.length ? db.select({ id: rendezVous.id, label: rendezVous.ticketId }).from(rendezVous).where(inArray(rendezVous.id, rdvIds)) : [],
    etudiantIds.length ? db.select({ id: etudiants.id, userId: etudiants.userId }).from(etudiants).where(inArray(etudiants.id, etudiantIds)) : [],
  ]);
  const students = await identityLogic.getUsersByIds(db, etuRows.map((e) => e.userId));

  const labelOf = (r: typeof auditLogs.$inferSelect): string | null => {
    if (r.entityId === "-") return null;
    if (r.entityType === "DEMANDE") return demandeRows.find((d) => d.id === r.entityId)?.label ?? null;
    if (r.entityType === "RENDEZ_VOUS") return rdvRows.find((d) => d.id === r.entityId)?.label ?? null;
    if (r.entityType === "ETUDIANT") {
      const e = etuRows.find((x) => x.id === r.entityId);
      const p = e ? students.get(e.userId)?.profile : null;
      return p ? [p.firstName, p.lastName].filter(Boolean).join(" ") : null;
    }
    return null;
  };

  return {
    data: rows.map((r) => ({
      id: r.id,
      at: r.at,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      targetLabel: labelOf(r),
      result: r.result,
      severity: r.severity,
    })),
    meta: paginationMeta(page, limit, total),
  };
}
