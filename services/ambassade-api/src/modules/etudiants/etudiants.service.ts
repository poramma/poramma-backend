import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/connection";
import { etudiants } from "../../db/schema.etudiants";
import { auditLogs } from "../../db/schema.audit";
import { NotFoundError, ConflictError } from "@poramma/utils";
import { paginationMeta } from "@poramma/dto";
import { writeAudit, enrichLog } from "../audit/audit.service";
import { assignInue as runAssignInue } from "../inue/inue.service";
import { listDocuments } from "../documents/documents.service";
import { etudiantsSource, EtudiantRaw, EtudiantsListFilters } from "./etudiants-source";
import { etudiantsLogic, notificationsLogic } from "@poramma/ambassade-core";

interface Actor {
  userId: string;
  roleName: string | null;
}

type EtudiantRow = typeof etudiants.$inferSelect;

function mergeView(raw: EtudiantRaw, tracking: EtudiantRow | null) {
  return {
    // Identifiant public de l'API = l'userId identity — stable, toujours
    // disponible (contrairement à l'id de suivi ambassade-api, qui n'existe
    // que pour un étudiant déjà "touché" — voir ensureEtudiantRecord).
    id: raw.userId,
    userId: raw.userId,
    email: raw.email,
    phone: raw.phone,
    firstName: raw.firstName,
    lastName: raw.lastName,
    nationality: raw.nationality,
    city: raw.city,
    country: raw.country,
    registeredAt: raw.registeredAt,
    accountStatus: raw.accountStatus,
    profile: {
      university: raw.university,
      faculty: raw.faculty,
      studyLevel: raw.studyLevel,
    },
    bourse: raw.hasBourse
      ? { isRecipient: true, decisionNumber: raw.scholarshipDecisionNumber, promotion: raw.scholarshipPromotion }
      : null,
    // Statut de validation (par ambassade-api) — PENDING virtuel tant
    // qu'aucun agent (ni le système) n'a encore créé la ligne de suivi.
    status: tracking?.status ?? "PENDING",
    inue: tracking?.inue ?? null,
    inueAssignedAt: tracking?.inueAssignedAt ?? null,
    // Date de soumission du dossier par le citoyen — null = compte créé mais dossier pas encore soumis.
    submittedAt: tracking?.submittedAt ?? null,
    reviewNote: tracking?.reviewNote ?? null,
    reviewedBy: tracking?.reviewedBy ?? null,
    reviewedAt: tracking?.reviewedAt ?? null,
  };
}

async function fetchTrackingByUserIds(userIds: string[]): Promise<Map<string, EtudiantRow>> {
  if (userIds.length === 0) return new Map();
  const rows = await db.select().from(etudiants).where(inArray(etudiants.userId, userIds));
  return new Map(rows.map((r) => [r.userId, r]));
}

/**
 * Récupère (ou crée, au premier contact) la ligne de suivi ambassade-api
 * pour cet étudiant. C'est ce premier appel — depuis le détail, une
 * validation, ou toute autre action — qui écrit l'entrée d'audit
 * "INSCRIPTION" (le système constate l'inscription), pas le simple
 * listing : lister la page ne doit pas générer d'écriture ni de bruit
 * d'audit à chaque chargement.
 */
async function ensureEtudiantRecord(userId: string): Promise<EtudiantRow> {
  return etudiantsLogic.ensureEtudiantRecord(db, userId);
}

async function getRawOrThrow(userId: string): Promise<EtudiantRaw> {
  const raw = await etudiantsSource.findByUserId(userId);
  if (!raw) throw new NotFoundError("Étudiant introuvable");
  return raw;
}

export async function listEtudiants(filters: {
  search?: string;
  status?: string;
  city?: string;
  university?: string;
  faculty?: string;
  studyLevel?: string;
  hasBourse?: boolean;
  hasInue?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const sourceFilters: EtudiantsListFilters = {
    search: filters.search,
    city: filters.city,
    university: filters.university,
    faculty: filters.faculty,
    studyLevel: filters.studyLevel,
    hasBourse: filters.hasBourse,
  };
  const rawList = await etudiantsSource.list(sourceFilters);
  const tracking = await fetchTrackingByUserIds(rawList.map((r) => r.userId));

  let merged = rawList.map((r) => mergeView(r, tracking.get(r.userId) ?? null));

  if (filters.status) merged = merged.filter((e) => e.status === filters.status);
  if (filters.hasInue !== undefined) merged = merged.filter((e) => (filters.hasInue ? !!e.inue : !e.inue));

  const sortBy = filters.sortBy ?? "registeredAt";
  const dir = filters.sortOrder === "asc" ? 1 : -1;
  merged.sort((a, b) => {
    if (sortBy === "name") {
      return dir * `${a.lastName ?? ""} ${a.firstName ?? ""}`.localeCompare(`${b.lastName ?? ""} ${b.firstName ?? ""}`);
    }
    if (sortBy === "status") return dir * a.status.localeCompare(b.status);
    const at = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
    const bt = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
    return dir * (at - bt);
  });

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const total = merged.length;
  const start = (page - 1) * limit;
  const data = merged.slice(start, start + limit);

  return { data, meta: paginationMeta(page, limit, total) };
}

export async function getEtudiantDetail(userId: string) {
  const raw = await getRawOrThrow(userId);
  const tracking = await ensureEtudiantRecord(userId);
  return mergeView(raw, tracking);
}

export async function searchEtudiants(query: string) {
  const rawList = await etudiantsSource.search(query);
  const tracking = await fetchTrackingByUserIds(rawList.map((r) => r.userId));
  return rawList.map((r) => mergeView(r, tracking.get(r.userId) ?? null));
}

export async function getEtudiantDocuments(userId: string) {
  await getRawOrThrow(userId); // 404 propre si l'utilisateur n'est pas (ou plus) étudiant
  return listDocuments({ ownerUserId: userId, limit: 200 });
}

export async function getEtudiantAudit(userId: string) {
  const tracking = await ensureEtudiantRecord(userId);
  const rows = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.entityType, "ETUDIANT"), eq(auditLogs.entityId, tracking.id)))
    .orderBy(desc(auditLogs.at));
  return Promise.all(rows.map(enrichLog));
}

/**
 * Validation en une seule étape — pas de workflow multi-niveaux (voir
 * project decision). Utilisable depuis PENDING ou REJECTED (un dossier
 * rejeté peut être revalidé après complément), pas depuis SUSPENDED (il
 * faut d'abord lever la suspension — non demandé dans ce périmètre).
 */
export async function validateEtudiant(userId: string, comment: string | undefined, actor: Actor) {
  await getRawOrThrow(userId);
  const tracking = await ensureEtudiantRecord(userId);

  if (tracking.status === "SUSPENDED") {
    throw new ConflictError("Un dossier suspendu ne peut pas être validé directement.");
  }

  const [updated] = await db
    .update(etudiants)
    .set({ status: "VALIDATED", reviewNote: comment ?? null, reviewedBy: actor.userId, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(etudiants.id, tracking.id))
    .returning();

  await writeAudit({
    action: "VALIDATE",
    entityType: "ETUDIANT",
    entityId: tracking.id,
    actor,
    details: { comment: comment ?? null },
  });

  await notificationsLogic.notifyRegistrationDecision(db, { userId, decision: "VALIDATED", inue: updated.inue });

  const raw = await getRawOrThrow(userId);
  return mergeView(raw, updated);
}

export async function rejectEtudiant(userId: string, reason: string, actor: Actor) {
  await getRawOrThrow(userId);
  const tracking = await ensureEtudiantRecord(userId);

  const [updated] = await db
    .update(etudiants)
    .set({ status: "REJECTED", reviewNote: reason, reviewedBy: actor.userId, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(etudiants.id, tracking.id))
    .returning();

  await writeAudit({
    action: "REJECT",
    entityType: "ETUDIANT",
    entityId: tracking.id,
    actor,
    result: "REJECT",
    details: { reason },
  });

  await notificationsLogic.notifyRegistrationDecision(db, { userId, decision: "REJECTED", note: reason });

  const raw = await getRawOrThrow(userId);
  return mergeView(raw, updated);
}

export async function suspendEtudiant(userId: string, reason: string, actor: Actor) {
  await getRawOrThrow(userId);
  const tracking = await ensureEtudiantRecord(userId);

  const [updated] = await db
    .update(etudiants)
    .set({ status: "SUSPENDED", reviewNote: reason, reviewedBy: actor.userId, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(etudiants.id, tracking.id))
    .returning();

  await writeAudit({
    action: "SUSPEND",
    entityType: "ETUDIANT",
    entityId: tracking.id,
    actor,
    severity: "WARNING",
    details: { reason },
  });

  await notificationsLogic.notifyRegistrationDecision(db, { userId, decision: "SUSPENDED", note: reason });

  const raw = await getRawOrThrow(userId);
  return mergeView(raw, updated);
}

/**
 * Détermine l'année de référence pour la génération INUE : la promotion de
 * la bourse pour un boursier, l'année d'inscription (identity.users.
 * created_at) sinon — voir project decision, aucune colonne dédiée
 * "année d'inscription" n'existe côté identity aujourd'hui.
 */
function determineInueYear(raw: EtudiantRaw): number {
  if (raw.hasBourse && raw.scholarshipPromotion) {
    const parsed = parseInt(raw.scholarshipPromotion, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return raw.registeredAt ? new Date(raw.registeredAt).getFullYear() : new Date().getFullYear();
}

export async function assignInueToEtudiant(userId: string, actor: Actor, yearOverride?: number) {
  const raw = await getRawOrThrow(userId);
  const tracking = await ensureEtudiantRecord(userId);

  if (tracking.status !== "VALIDATED") {
    throw new ConflictError("Seul un étudiant validé peut se voir attribuer un INUE.");
  }

  const year = yearOverride ?? determineInueYear(raw);
  const result = await runAssignInue(tracking.id, year, actor);

  const updatedRaw = await getRawOrThrow(userId);
  const [updatedTracking] = await db.select().from(etudiants).where(eq(etudiants.id, tracking.id));
  await notificationsLogic.notifyRegistrationDecision(db, { userId, decision: "INUE_ASSIGNED", inue: updatedTracking.inue });
  return { ...mergeView(updatedRaw, updatedTracking), inueAssignment: result };
}

export async function estimateEtudiants(filters: {
  status?: string;
  city?: string;
  university?: string;
  faculty?: string;
  studyLevel?: string;
  hasBourse?: boolean;
}) {
  const { data, meta } = await listEtudiants({ ...filters, page: 1, limit: 1_000_000 });
  return { count: meta.total, sample: data.slice(0, 5).map((e) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName })) };
}
