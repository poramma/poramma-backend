"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listInternalDocuments = listInternalDocuments;
exports.getInternalDocument = getInternalDocument;
exports.createInternalDocument = createInternalDocument;
exports.shareInternalDocument = shareInternalDocument;
exports.downloadInternalDocument = downloadInternalDocument;
const crypto_1 = __importDefault(require("crypto"));
const connection_1 = require("../../db/connection");
const schema_documents_1 = require("../../db/schema.documents");
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const storage_1 = require("@poramma/storage");
const enrich_1 = require("../../shared/enrich");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-150);
}
async function writeAudit(params) {
    await connection_1.db.insert(schema_documents_1.documentAuditLogs).values({
        id: newId("aud"),
        documentId: params.documentId,
        documentKind: "INTERNAL_DOCUMENT",
        action: params.action,
        actorUserId: params.actor.userId,
        actorName: await (0, enrich_1.getActorName)(params.actor.userId),
        actorRole: params.actor.roleName,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        details: params.details ?? null,
    });
}
async function enrich(row) {
    const [file, createdByUser] = await Promise.all([
        connection_1.db
            .select()
            .from(schema_documents_1.storedFiles)
            .where((0, drizzle_orm_1.eq)(schema_documents_1.storedFiles.id, row.fileId))
            .then((r) => r[0] ?? null),
        (0, enrich_1.getUser)(row.createdBy),
    ]);
    return {
        ...row,
        previousVersionId: null,
        file: file ? { ...file, encryptionKeyId: null } : null,
        createdByUser,
    };
}
async function canAccess(row, actor) {
    if (row.confidentiality === "PUBLIC" || row.confidentiality === "INTERNAL")
        return true;
    if (row.createdBy === actor.userId)
        return true;
    if (actor.roleName === "ADMIN")
        return true;
    const targetRoleIds = row.targetRoleIds ?? [];
    if (actor.roleId && targetRoleIds.includes(actor.roleId))
        return true;
    const targetAgentIds = row.targetAgentIds ?? [];
    const agent = await (0, enrich_1.getAgentByUserId)(actor.userId);
    if (agent && targetAgentIds.includes(agent.id))
        return true;
    return false;
}
async function listInternalDocuments(actor, query) {
    const conditions = [];
    if (query.department)
        conditions.push((0, drizzle_orm_1.eq)(schema_documents_1.internalDocuments.department, query.department));
    if (query.confidentiality)
        conditions.push((0, drizzle_orm_1.eq)(schema_documents_1.internalDocuments.confidentiality, query.confidentiality));
    const rows = await connection_1.db
        .select()
        .from(schema_documents_1.internalDocuments)
        .where(conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined)
        .orderBy((0, drizzle_orm_1.desc)(schema_documents_1.internalDocuments.createdAt));
    const accessible = [];
    for (const row of rows) {
        if (await canAccess(row, actor))
            accessible.push(row);
    }
    const enriched = await Promise.all(accessible.map(enrich));
    if (query.search) {
        const s = query.search.toLowerCase();
        return enriched.filter((d) => d.title.toLowerCase().includes(s) || d.tags.some((t) => t.toLowerCase().includes(s)));
    }
    return enriched;
}
async function getInternalDocument(id, actor) {
    const [row] = await connection_1.db.select().from(schema_documents_1.internalDocuments).where((0, drizzle_orm_1.eq)(schema_documents_1.internalDocuments.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Document interne introuvable");
    if (!(await canAccess(row, actor)))
        throw new utils_1.ForbiddenError("Accès non autorisé à ce document");
    return enrich(row);
}
async function createInternalDocument(fileBuffer, originalName, mimeType, data, actor, ip, userAgent) {
    const fileId = newId("file");
    const key = `internal-documents/${fileId}/${sanitizeFilename(originalName)}`;
    await (0, storage_1.uploadObject)(key, fileBuffer, mimeType);
    const [file] = await connection_1.db
        .insert(schema_documents_1.storedFiles)
        .values({
        id: fileId,
        path: key,
        mimeType,
        originalName,
        checksum: crypto_1.default.createHash("sha256").update(fileBuffer).digest("hex"),
        size: fileBuffer.length,
        uploadedBy: actor.userId,
    })
        .returning();
    const [doc] = await connection_1.db
        .insert(schema_documents_1.internalDocuments)
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
async function shareInternalDocument(id, data, actor) {
    const [existing] = await connection_1.db.select().from(schema_documents_1.internalDocuments).where((0, drizzle_orm_1.eq)(schema_documents_1.internalDocuments.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Document interne introuvable");
    if (!(await canAccess(existing, actor)))
        throw new utils_1.ForbiddenError("Accès non autorisé à ce document");
    const [updated] = await connection_1.db
        .update(schema_documents_1.internalDocuments)
        .set({ targetAgentIds: data.targetAgentIds, targetRoleIds: data.targetRoleIds, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_documents_1.internalDocuments.id, id))
        .returning();
    await writeAudit({ documentId: id, action: "SHARE", actor, details: { targetAgentIds: data.targetAgentIds, targetRoleIds: data.targetRoleIds } });
    return enrich(updated);
}
async function downloadInternalDocument(id, actor, ip, userAgent) {
    const doc = await getInternalDocument(id, actor);
    if (!doc.file)
        throw new utils_1.NotFoundError("Fichier introuvable");
    const { buffer, contentType } = await (0, storage_1.getObject)(doc.file.path);
    await writeAudit({ documentId: id, action: "DOWNLOAD", actor, ipAddress: ip, userAgent });
    return { buffer, contentType: contentType ?? doc.file.mimeType, filename: doc.file.originalName };
}
//# sourceMappingURL=internal-documents.service.js.map