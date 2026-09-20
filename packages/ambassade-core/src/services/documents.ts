import crypto from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@poramma/utils";
import { uploadObject, getObject } from "@poramma/storage";
import type { Db } from "../db-type";
import { documentCategories, storedFiles, documents, documentVersions, documentAuditLogs } from "../schema/documents";
import { demandeDocuments, demandeRequirements } from "../schema/demandes";
import { getUser, getActorName } from "./identity";
import { recordComplementProvided } from "./demandes";

interface Actor {
  userId: string;
  roleName: string | null;
}

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-150);
}

export async function writeDocumentAudit(
  db: Db,
  params: {
    documentId: string;
    documentKind?: string;
    action: string;
    actor: Actor;
    ipAddress?: string | null;
    userAgent?: string | null;
    details?: Record<string, unknown> | null;
  }
) {
  await db.insert(documentAuditLogs).values({
    id: newId("aud"),
    documentId: params.documentId,
    documentKind: params.documentKind ?? "STUDENT_DOCUMENT",
    action: params.action,
    actorUserId: params.actor.userId,
    actorName: await getActorName(db, params.actor.userId),
    actorRole: params.actor.roleName,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    details: params.details ?? null,
  });
}

export async function listCategories(db: Db) {
  return db.select().from(documentCategories);
}

async function enrichDocument(db: Db, row: typeof documents.$inferSelect) {
  const [file, owner, category, reviewedByUser] = await Promise.all([
    db
      .select()
      .from(storedFiles)
      .where(eq(storedFiles.id, row.fileId))
      .then((r) => r[0] ?? null),
    getUser(db, row.ownerUserId),
    row.categoryId
      ? db
          .select()
          .from(documentCategories)
          .where(eq(documentCategories.id, row.categoryId))
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
    row.reviewedBy ? getUser(db, row.reviewedBy) : Promise.resolve(null),
  ]);
  return { ...row, previousVersionId: null, file: file ? { ...file, encryptionKeyId: null } : null, owner, category, reviewedByUser };
}

export async function listDocuments(
  db: Db,
  query: {
    status?: string;
    type?: string;
    categoryId?: string;
    ownerUserId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }
) {
  const conditions = [];
  if (query.status) conditions.push(eq(documents.status, query.status));
  if (query.type) conditions.push(eq(documents.type, query.type));
  if (query.categoryId) conditions.push(eq(documents.categoryId, query.categoryId));
  if (query.ownerUserId) conditions.push(eq(documents.ownerUserId, query.ownerUserId));

  const page = query.page ?? 1;
  const limit = query.limit ?? 50;

  const rows = await db
    .select()
    .from(documents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(documents.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  const enriched = await Promise.all(rows.map((r) => enrichDocument(db, r)));

  if (query.search) {
    const s = query.search.toLowerCase();
    return enriched.filter(
      (d) =>
        d.owner?.profile?.firstName?.toLowerCase().includes(s) ||
        d.owner?.profile?.lastName?.toLowerCase().includes(s) ||
        d.owner?.profile?.inue?.toLowerCase().includes(s) ||
        d.file?.originalName?.toLowerCase().includes(s)
    );
  }
  return enriched;
}

export async function getDocument(db: Db, id: string) {
  const [row] = await db.select().from(documents).where(eq(documents.id, id));
  if (!row) throw new NotFoundError("Document introuvable");
  return enrichDocument(db, row);
}

export async function getDocumentOwnerId(db: Db, id: string): Promise<string> {
  const [row] = await db.select({ ownerUserId: documents.ownerUserId }).from(documents).where(eq(documents.id, id));
  if (!row) throw new NotFoundError("Document introuvable");
  return row.ownerUserId;
}

export async function uploadDocument(
  db: Db,
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  data: {
    type: string;
    ownerUserId: string;
    categoryId?: string | null;
    expiryDate?: string | null;
    notes?: string | null;
    demandeId?: string | null;
    requirementId?: string | null;
  },
  actor: Actor,
  ip?: string | null,
  userAgent?: string | null
) {
  if (data.categoryId) {
    const [category] = await db.select().from(documentCategories).where(eq(documentCategories.id, data.categoryId));
    if (!category) throw new ValidationError("Catégorie introuvable", { categoryId: ["not found"] });
    const allowed = (category.allowedTypes as string[]) ?? [];
    if (allowed.length && !allowed.includes(data.type)) {
      throw new ValidationError("Ce type de document n'est pas autorisé pour cette catégorie", { type: ["not allowed for category"] });
    }
  }

  // Le prérequis visé doit appartenir au dossier indiqué — sans ce contrôle,
  // on pourrait marquer "fourni" le prérequis d'un autre dossier.
  if (data.demandeId && data.requirementId) {
    const [req] = await db
      .select({ id: demandeRequirements.id })
      .from(demandeRequirements)
      .where(and(eq(demandeRequirements.id, data.requirementId), eq(demandeRequirements.demandeId, data.demandeId)));
    if (!req) throw new ValidationError("Ce prérequis n'appartient pas à ce dossier.", { requirementId: ["not in demande"] });
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

  const [doc] = await db
    .insert(documents)
    .values({
      id: newId("doc"),
      ownerUserId: data.ownerUserId,
      type: data.type,
      categoryId: data.categoryId ?? null,
      fileId: file.id,
      status: "UPLOADED",
      expiryDate: data.expiryDate ?? null,
      notes: data.notes ?? null,
      version: 1,
    })
    .returning();

  await db.insert(documentVersions).values({
    id: newId("dver"),
    documentId: doc.id,
    fileId: file.id,
    version: 1,
    createdBy: actor.userId,
  });

  // Espace d'échange avec une demande : si fourni contre une exigence
  // précise, lie le document et fait passer l'exigence à PROVIDED.
  // Une pièce peut être jointe à un dossier sans viser un prérequis précis
  // (pièce complémentaire) : le lien demande↔document est écrit dans les deux
  // cas, seul le passage du prérequis à PROVIDED dépend de requirementId.
  if (data.demandeId) {
    await db.insert(demandeDocuments).values({
      id: newId("ddoc"),
      demandeId: data.demandeId,
      documentId: doc.id,
      requirementId: data.requirementId ?? null,
      isPrimary: !!data.requirementId,
    });
    if (data.requirementId) {
      await db
        .update(demandeRequirements)
        .set({ status: "PROVIDED", providedDocumentId: doc.id })
        .where(eq(demandeRequirements.id, data.requirementId));
    }
    await recordComplementProvided(db, data.demandeId, actor, "document");
  }

  await writeDocumentAudit(db, { documentId: doc.id, action: "UPLOAD", actor, ipAddress: ip, userAgent, details: { fileName: originalName } });

  return enrichDocument(db, doc);
}

export async function downloadDocument(db: Db, id: string, actor: Actor, ip?: string | null, userAgent?: string | null) {
  const doc = await getDocument(db, id);
  if (!doc.file) throw new NotFoundError("Fichier introuvable");
  const { buffer, contentType } = await getObject(doc.file.path);
  await writeDocumentAudit(db, { documentId: id, action: "DOWNLOAD", actor, ipAddress: ip, userAgent });
  return { buffer, contentType: contentType ?? doc.file.mimeType, filename: doc.file.originalName };
}

/**
 * Suppression self-service (RÈGLE mission §4.4) — uniquement avant
 * validation (status UPLOADED), pour éviter de faire disparaître une pièce
 * déjà examinée par un agent. Supprime la ligne document + ses versions
 * (cascade DB) ; les objets MinIO orphelins ne sont pas nettoyés ici (pas de
 * contrainte qui l'exige, laissé pour un futur job de purge).
 */
export async function deleteDocument(db: Db, id: string, actor: Actor) {
  const [existing] = await db.select().from(documents).where(eq(documents.id, id));
  if (!existing) throw new NotFoundError("Document introuvable");
  if (existing.status !== "UPLOADED") {
    throw new ValidationError("Ce document a déjà été examiné et ne peut plus être supprimé.", { status: ["already reviewed"] });
  }

  await db.delete(documents).where(eq(documents.id, id));
  await writeDocumentAudit(db, { documentId: id, action: "DELETE", actor, details: { reason: "self-service" } });
}
