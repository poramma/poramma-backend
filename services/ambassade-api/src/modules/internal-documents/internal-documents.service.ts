import crypto from "crypto";
import { db } from "../../db/connection";
import { internalDocuments, storedFiles, documentAuditLogs } from "../../db/schema.documents";
import { eq, and, desc } from "drizzle-orm";
import { NotFoundError, ForbiddenError } from "@poramma/utils";
import { uploadObject, getObject } from "@poramma/storage";
import { getUser, getActorName, getAgentByUserId } from "../../shared/enrich";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-150);
}

interface Actor {
  userId: string;
  roleId: string | null;
  roleName: string | null;
}

async function writeAudit(params: {
  documentId: string;
  action: string;
  actor: Actor;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
}) {
  await db.insert(documentAuditLogs).values({
    id: newId("aud"),
    documentId: params.documentId,
    documentKind: "INTERNAL_DOCUMENT",
    action: params.action,
    actorUserId: params.actor.userId,
    actorName: await getActorName(params.actor.userId),
    actorRole: params.actor.roleName,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    details: params.details ?? null,
  });
}

async function enrich(row: typeof internalDocuments.$inferSelect) {
  const [file, createdByUser] = await Promise.all([
    db
      .select()
      .from(storedFiles)
      .where(eq(storedFiles.id, row.fileId))
      .then((r) => r[0] ?? null),
    getUser(row.createdBy),
  ]);
  return {
    ...row,
    previousVersionId: null,
    file: file ? { ...file, encryptionKeyId: null } : null,
    createdByUser,
  };
}

/**
 * Un document PUBLIC/INTERNAL est visible par tout le staff avec
 * document:read (mêmes règles que documents/demandes — le contrôleur gate
 * déjà l'accès à la route). RESTRICTED/CONFIDENTIAL ne sont visibles que
 * par : le créateur, un ADMIN, ou un destinataire explicite (rôle ou agent).
 */
async function canAccess(row: typeof internalDocuments.$inferSelect, actor: Actor): Promise<boolean> {
  if (row.confidentiality === "PUBLIC" || row.confidentiality === "INTERNAL") return true;
  if (row.createdBy === actor.userId) return true;
  if (actor.roleName === "ADMIN") return true;

  const targetRoleIds = (row.targetRoleIds as string[] | null) ?? [];
  if (actor.roleId && targetRoleIds.includes(actor.roleId)) return true;

  const targetAgentIds = (row.targetAgentIds as string[] | null) ?? [];
  const agent = await getAgentByUserId(actor.userId);
  if (agent && targetAgentIds.includes(agent.id)) return true;

  return false;
}

export async function listInternalDocuments(
  actor: Actor,
  query: { department?: string; confidentiality?: string; search?: string }
) {
  const conditions = [];
  if (query.department) conditions.push(eq(internalDocuments.department, query.department));
  if (query.confidentiality) conditions.push(eq(internalDocuments.confidentiality, query.confidentiality));

  const rows = await db
    .select()
    .from(internalDocuments)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(internalDocuments.createdAt));

  const accessible = [];
  for (const row of rows) {
    if (await canAccess(row, actor)) accessible.push(row);
  }

  const enriched = await Promise.all(accessible.map(enrich));

  if (query.search) {
    const s = query.search.toLowerCase();
    return enriched.filter((d) => d.title.toLowerCase().includes(s) || (d.tags as string[]).some((t) => t.toLowerCase().includes(s)));
  }
  return enriched;
}

export async function getInternalDocument(id: string, actor: Actor) {
  const [row] = await db.select().from(internalDocuments).where(eq(internalDocuments.id, id));
  if (!row) throw new NotFoundError("Document interne introuvable");
  if (!(await canAccess(row, actor))) throw new ForbiddenError("Accès non autorisé à ce document");
  return enrich(row);
}

export async function createInternalDocument(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  data: { title: string; department: string; confidentiality: string; tags: string[] },
  actor: Actor,
  ip?: string | null,
  userAgent?: string | null
) {
  const fileId = newId("file");
  const key = `internal-documents/${fileId}/${sanitizeFilename(originalName)}`;
  await uploadObject(key, fileBuffer, mimeType);

  const [file] = await db
    .insert(storedFiles)
    .values({
      id: fileId,
      path: key,
      mimeType,
      originalName,
      checksum: crypto.createHash("sha256").update(fileBuffer).digest("hex"),
      size: fileBuffer.length,
      uploadedBy: actor.userId,
    })
    .returning();

  const [doc] = await db
    .insert(internalDocuments)
    .values({
      id: newId("idoc"),
      title: data.title,
      fileId: file.id,
      department: data.department,
      confidentiality: data.confidentiality,
      tags: data.tags,
      createdBy: actor.userId,
    })
    .returning();

  await writeAudit({ documentId: doc.id, action: "UPLOAD", actor, ipAddress: ip, userAgent, details: { fileName: originalName } });

  return enrich(doc);
}

export async function shareInternalDocument(
  id: string,
  data: { targetAgentIds: string[]; targetRoleIds: string[] },
  actor: Actor
) {
  const [existing] = await db.select().from(internalDocuments).where(eq(internalDocuments.id, id));
  if (!existing) throw new NotFoundError("Document interne introuvable");
  if (!(await canAccess(existing, actor))) throw new ForbiddenError("Accès non autorisé à ce document");

  const [updated] = await db
    .update(internalDocuments)
    .set({ targetAgentIds: data.targetAgentIds, targetRoleIds: data.targetRoleIds, updatedAt: new Date() })
    .where(eq(internalDocuments.id, id))
    .returning();

  await writeAudit({ documentId: id, action: "SHARE", actor, details: { targetAgentIds: data.targetAgentIds, targetRoleIds: data.targetRoleIds } });

  return enrich(updated);
}

export async function downloadInternalDocument(id: string, actor: Actor, ip?: string | null, userAgent?: string | null) {
  const doc = await getInternalDocument(id, actor);
  if (!doc.file) throw new NotFoundError("Fichier introuvable");
  const { buffer, contentType } = await getObject(doc.file.path);
  await writeAudit({ documentId: id, action: "DOWNLOAD", actor, ipAddress: ip, userAgent });
  return { buffer, contentType: contentType ?? doc.file.mimeType, filename: doc.file.originalName };
}
