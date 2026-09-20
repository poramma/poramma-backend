import crypto from "crypto";
import { db } from "../../db/connection";
import { documentCategories, storedFiles, documents, documentVersions, documentAuditLogs } from "../../db/schema.documents";
import { demandeDocuments, demandeRequirements } from "../../db/schema.demandes";
import { eq, and, desc } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@poramma/utils";
import { uploadObject } from "@poramma/storage";
import { getUser, getActorName } from "../../shared/enrich";
import { documentsLogic } from "@poramma/ambassade-core";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-150);
}

interface Actor {
  userId: string;
  roleName: string | null;
}

// ============================================================
// Categories
// ============================================================

export async function listCategories() {
  return db.select().from(documentCategories);
}

export async function createCategory(data: {
  name: string;
  code: string;
  description?: string | null;
  allowedTypes: string[];
  requiresValidation?: boolean;
  maxVersions?: number;
  retentionDays?: number | null;
}) {
  const [row] = await db
    .insert(documentCategories)
    .values({ id: newId("cat"), ...data })
    .returning();
  return row;
}

export async function updateCategory(id: string, data: Partial<typeof documentCategories.$inferInsert>) {
  const [existing] = await db.select().from(documentCategories).where(eq(documentCategories.id, id));
  if (!existing) throw new NotFoundError("Catégorie introuvable");

  const [updated] = await db.update(documentCategories).set(data).where(eq(documentCategories.id, id)).returning();
  return updated;
}

export async function deleteCategory(id: string) {
  const [existing] = await db.select().from(documentCategories).where(eq(documentCategories.id, id));
  if (!existing) throw new NotFoundError("Catégorie introuvable");
  await db.delete(documentCategories).where(eq(documentCategories.id, id));
}

// ============================================================
// Audit
// ============================================================

async function writeAudit(params: {
  documentId: string;
  documentKind?: string;
  action: string;
  actor: Actor;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
}) {
  await db.insert(documentAuditLogs).values({
    id: newId("aud"),
    documentId: params.documentId,
    documentKind: params.documentKind ?? "STUDENT_DOCUMENT",
    action: params.action,
    actorUserId: params.actor.userId,
    actorName: await getActorName(params.actor.userId),
    actorRole: params.actor.roleName,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    details: params.details ?? null,
  });
}

export async function logView(documentId: string, actor: Actor, ip?: string | null, userAgent?: string | null) {
  await writeAudit({ documentId, action: "VIEW", actor, ipAddress: ip, userAgent });
}

export async function listAudit(documentId: string | undefined, limit: number) {
  const conditions = documentId ? [eq(documentAuditLogs.documentId, documentId)] : [];
  return db
    .select()
    .from(documentAuditLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(documentAuditLogs.createdAt))
    .limit(limit);
}

// ============================================================
// Documents
// ============================================================

async function enrichDocument(row: typeof documents.$inferSelect) {
  const [file, owner, category, reviewedByUser] = await Promise.all([
    db
      .select()
      .from(storedFiles)
      .where(eq(storedFiles.id, row.fileId))
      .then((r) => r[0] ?? null),
    getUser(row.ownerUserId),
    row.categoryId
      ? db
          .select()
          .from(documentCategories)
          .where(eq(documentCategories.id, row.categoryId))
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    row.reviewedBy ? getUser(row.reviewedBy) : Promise.resolve(null),
  ]);
  // `encryptionKeyId` (StoredFile) and `previousVersionId` (DocumentGED) are
  // part of the frontend's type shape but not implemented — encryption-at-
  // rest doesn't exist, and version history lives entirely in
  // document_versions instead of a documents-row linked-list. Always null.
  // `owner`/`reviewedByUser` let the frontend show a name instead of a raw
  // uuid — see project memory for the "never display a raw ID" convention.
  return { ...row, previousVersionId: null, file: file ? { ...file, encryptionKeyId: null } : null, owner, category, reviewedByUser };
}

// listDocuments/getDocument/getDocumentOwnerId/uploadDocument déplacées dans
// @poramma/ambassade-core (partagées avec communaute-api) ; ce fichier ne
// fait que lier le pool de connexion local.
export const listDocuments = (query: Parameters<typeof documentsLogic.listDocuments>[1]) => documentsLogic.listDocuments(db, query);
export const getDocument = (id: string) => documentsLogic.getDocument(db, id);
export const getDocumentOwnerId = (id: string) => documentsLogic.getDocumentOwnerId(db, id);
export const uploadDocument = (
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  data: Parameters<typeof documentsLogic.uploadDocument>[4],
  actor: Actor,
  ip?: string | null,
  userAgent?: string | null
) => documentsLogic.uploadDocument(db, fileBuffer, originalName, mimeType, data, actor, ip, userAgent);

export async function addDocumentVersion(
  documentId: string,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  changeNote: string | undefined,
  actor: Actor
) {
  const [existing] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!existing) throw new NotFoundError("Document introuvable");

  if (existing.categoryId) {
    const [category] = await db.select().from(documentCategories).where(eq(documentCategories.id, existing.categoryId));
    if (category?.maxVersions && existing.version >= category.maxVersions) {
      throw new ValidationError("Nombre maximum de versions atteint pour cette catégorie", { version: ["max versions reached"] });
    }
  }

  const fileId = newId("file");
  const key = `documents/${fileId}/${sanitizeFilename(originalName)}`;
  const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");
  await uploadObject(key, fileBuffer, mimeType);

  const [file] = await db
    .insert(storedFiles)
    .values({
      id: fileId,
      path: key,
      mimeType,
      originalName,
      checksum,
      size: fileBuffer.length,
      uploadedBy: actor.userId,
    })
    .returning();

  const newVersion = existing.version + 1;
  // Une nouvelle version repart en attente de relecture — l'ancienne
  // décision (ACCEPTED/REJECTED) ne s'applique plus au nouveau fichier.
  const [updated] = await db
    .update(documents)
    .set({ fileId: file.id, version: newVersion, status: "UPLOADED", reviewedBy: null, reviewedAt: null, reviewNote: null, updatedAt: new Date() })
    .where(eq(documents.id, documentId))
    .returning();

  await db.insert(documentVersions).values({
    id: newId("dver"),
    documentId,
    fileId: file.id,
    version: newVersion,
    changeNote: changeNote ?? null,
    createdBy: actor.userId,
  });

  await writeAudit({ documentId, action: "UPLOAD", actor, details: { version: newVersion, changeNote } });

  return enrichDocument(updated);
}

export async function listVersions(documentId: string) {
  const rows = await db.select().from(documentVersions).where(eq(documentVersions.documentId, documentId)).orderBy(desc(documentVersions.version));
  return Promise.all(
    rows.map(async (v) => {
      const [file] = await db.select().from(storedFiles).where(eq(storedFiles.id, v.fileId));
      return { ...v, file: file ? { ...file, encryptionKeyId: null } : null };
    })
  );
}

export const downloadDocument = (id: string, actor: Actor, ip?: string | null, userAgent?: string | null) =>
  documentsLogic.downloadDocument(db, id, actor, ip, userAgent);

export async function validateDocument(id: string, status: "ACCEPTED" | "REJECTED", reviewNote: string | undefined, actor: Actor) {
  const [existing] = await db.select().from(documents).where(eq(documents.id, id));
  if (!existing) throw new NotFoundError("Document introuvable");

  const [updated] = await db
    .update(documents)
    .set({ status, reviewNote: reviewNote ?? null, reviewedBy: actor.userId, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(documents.id, id))
    .returning();

  // Répercute la décision sur l'exigence de demande liée, s'il y en a une.
  const [link] = await db.select().from(demandeDocuments).where(eq(demandeDocuments.documentId, id));
  if (link?.requirementId) {
    await db
      .update(demandeRequirements)
      .set({ status: status === "ACCEPTED" ? "ACCEPTED" : "REJECTED", reviewerNote: reviewNote ?? null, reviewedBy: actor.userId, reviewedAt: new Date() })
      .where(eq(demandeRequirements.id, link.requirementId));
  }

  await writeAudit({ documentId: id, action: status === "ACCEPTED" ? "VALIDATE" : "REJECT", actor, details: { reviewNote } });

  return enrichDocument(updated);
}

/**
 * Pas de statut ARCHIVED distinct côté frontend (DocStatus n'a que UPLOADED/
 * IN_REVIEW/ACCEPTED/REJECTED/EXPIRED) — ArchivesPage.tsx affiche déjà les
 * documents "expirés/archivés" ensemble, donc archiver = passer à EXPIRED.
 * DocumentAuditAction n'a pas non plus de valeur ARCHIVE — DELETE est le
 * plus proche sémantiquement (retrait de la circulation active).
 */
export async function archiveDocument(id: string, actor: Actor) {
  const [existing] = await db.select().from(documents).where(eq(documents.id, id));
  if (!existing) throw new NotFoundError("Document introuvable");

  const [updated] = await db.update(documents).set({ status: "EXPIRED", updatedAt: new Date() }).where(eq(documents.id, id)).returning();

  await writeAudit({ documentId: id, action: "DELETE", actor, details: { reason: "archived" } });

  return enrichDocument(updated);
}

export async function getStats() {
  const rows = await db.select().from(documents);

  const totalPending = rows.filter((d) => d.status === "UPLOADED" || d.status === "IN_REVIEW").length;
  const totalAccepted = rows.filter((d) => d.status === "ACCEPTED").length;
  const totalRejected = rows.filter((d) => d.status === "REJECTED").length;

  const reviewed = rows.filter((d) => d.reviewedAt && d.createdAt);
  const averageReviewTimeHours = reviewed.length
    ? reviewed.reduce((sum, d) => sum + (new Date(d.reviewedAt!).getTime() - new Date(d.createdAt!).getTime()) / 3_600_000, 0) / reviewed.length
    : 0;

  const expiringSoonCount = rows.filter((d) => {
    if (!d.expiryDate) return false;
    const days = (new Date(d.expiryDate).getTime() - Date.now()) / 86_400_000;
    return days >= 0 && days <= 30;
  }).length;

  const byType = Object.entries(
    rows.reduce((acc: Record<string, number>, d) => {
      acc[d.type] = (acc[d.type] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([type, count]) => ({ type, count }));

  const byStatus = Object.entries(
    rows.reduce((acc: Record<string, number>, d) => {
      acc[d.status] = (acc[d.status] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([status, count]) => ({ status, count }));

  const recentActivity = await db.select().from(documentAuditLogs).orderBy(desc(documentAuditLogs.createdAt)).limit(10);

  return { totalPending, totalAccepted, totalRejected, averageReviewTimeHours, expiringSoonCount, byType, byStatus, recentActivity };
}
