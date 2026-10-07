import { eq, desc, inArray, sql } from "drizzle-orm";
import { db } from "../../db/connection";
import { auditLogs } from "../../db/schema.audit";
import { demandes } from "../../db/schema.demandes";
import { rendezVous } from "../../db/schema.rendezvous";
import { etudiants } from "../../db/schema.etudiants";
import { auditLogic, identityLogic } from "@poramma/ambassade-core";
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

export type AuditFilters = auditLogic.AuditFilters;

// ── Lecture : journal de l'AMBASSADE uniquement ──────────────────────────
// Le domaine est figé ici : ce back-office ne lit jamais le journal de la
// plateforme communautaire (sa propre administration a son espace dédié, voir
// communaute-api /admin/audit). Le filtrage est fait en SQL, dans la couche
// partagée, pour la liste, le détail, les statistiques ET l'export.
const DOMAIN = "EMBASSY" as const;

export async function enrichLogs(rows: (typeof auditLogs.$inferSelect)[]) {
  return auditLogic.enrichLogs(db, rows);
}

export async function enrichLog(row: typeof auditLogs.$inferSelect) {
  return (await enrichLogs([row]))[0];
}

/** Liste paginée : `data` (la page demandée) et `meta` (total, pages) pour l'affichage paginé. */
export async function listLogs(filters: AuditFilters) {
  const { data, total, page, limit } = await auditLogic.listLogs(db, DOMAIN, filters);
  return { data, meta: paginationMeta(page, limit, total) };
}

export async function getLog(id: string) {
  return auditLogic.getLog(db, DOMAIN, id);
}

export async function getStats() {
  return auditLogic.getStats(db, DOMAIN);
}

export async function exportLogsAsCsv(filters: AuditFilters): Promise<string> {
  return auditLogic.exportLogsAsCsv(db, DOMAIN, filters);
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
