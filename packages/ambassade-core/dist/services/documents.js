"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeDocumentAudit = writeDocumentAudit;
exports.listCategories = listCategories;
exports.listDocuments = listDocuments;
exports.getDocument = getDocument;
exports.getDocumentOwnerId = getDocumentOwnerId;
exports.uploadDocument = uploadDocument;
exports.downloadDocument = downloadDocument;
exports.deleteDocument = deleteDocument;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const storage_1 = require("@poramma/storage");
const documents_1 = require("../schema/documents");
const demandes_1 = require("../schema/demandes");
const identity_1 = require("./identity");
const demandes_2 = require("./demandes");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-150);
}
async function writeDocumentAudit(db, params) {
    await db.insert(documents_1.documentAuditLogs).values({
        id: newId("aud"),
        documentId: params.documentId,
        documentKind: params.documentKind ?? "STUDENT_DOCUMENT",
        action: params.action,
        actorUserId: params.actor.userId,
        actorName: await (0, identity_1.getActorName)(db, params.actor.userId),
        actorRole: params.actor.roleName,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        details: params.details ?? null,
    });
}
async function listCategories(db) {
    return db.select().from(documents_1.documentCategories);
}
async function enrichDocument(db, row) {
    const [file, owner, category, reviewedByUser] = await Promise.all([
        db
            .select()
            .from(documents_1.storedFiles)
            .where((0, drizzle_orm_1.eq)(documents_1.storedFiles.id, row.fileId))
            .then((r) => r[0] ?? null),
        (0, identity_1.getUser)(db, row.ownerUserId),
        row.categoryId
            ? db
                .select()
                .from(documents_1.documentCategories)
                .where((0, drizzle_orm_1.eq)(documents_1.documentCategories.id, row.categoryId))
                .then((r) => r[0] ?? null)
            : Promise.resolve(null),
        row.reviewedBy ? (0, identity_1.getUser)(db, row.reviewedBy) : Promise.resolve(null),
    ]);
    return { ...row, previousVersionId: null, file: file ? { ...file, encryptionKeyId: null } : null, owner, category, reviewedByUser };
}
async function listDocuments(db, query) {
    const conditions = [];
    if (query.status)
        conditions.push((0, drizzle_orm_1.eq)(documents_1.documents.status, query.status));
    if (query.type)
        conditions.push((0, drizzle_orm_1.eq)(documents_1.documents.type, query.type));
    if (query.categoryId)
        conditions.push((0, drizzle_orm_1.eq)(documents_1.documents.categoryId, query.categoryId));
    if (query.ownerUserId)
        conditions.push((0, drizzle_orm_1.eq)(documents_1.documents.ownerUserId, query.ownerUserId));
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const rows = await db
        .select()
        .from(documents_1.documents)
        .where(conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined)
        .orderBy((0, drizzle_orm_1.desc)(documents_1.documents.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
    const enriched = await Promise.all(rows.map((r) => enrichDocument(db, r)));
    if (query.search) {
        const s = query.search.toLowerCase();
        return enriched.filter((d) => d.owner?.profile?.firstName?.toLowerCase().includes(s) ||
            d.owner?.profile?.lastName?.toLowerCase().includes(s) ||
            d.owner?.profile?.inue?.toLowerCase().includes(s) ||
            d.file?.originalName?.toLowerCase().includes(s));
    }
    return enriched;
}
async function getDocument(db, id) {
    const [row] = await db.select().from(documents_1.documents).where((0, drizzle_orm_1.eq)(documents_1.documents.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Document introuvable");
    return enrichDocument(db, row);
}
async function getDocumentOwnerId(db, id) {
    const [row] = await db.select({ ownerUserId: documents_1.documents.ownerUserId }).from(documents_1.documents).where((0, drizzle_orm_1.eq)(documents_1.documents.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Document introuvable");
    return row.ownerUserId;
}
async function uploadDocument(db, fileBuffer, originalName, mimeType, data, actor, ip, userAgent) {
    if (data.categoryId) {
        const [category] = await db.select().from(documents_1.documentCategories).where((0, drizzle_orm_1.eq)(documents_1.documentCategories.id, data.categoryId));
        if (!category)
            throw new utils_1.ValidationError("Catégorie introuvable", { categoryId: ["not found"] });
        const allowed = category.allowedTypes ?? [];
        if (allowed.length && !allowed.includes(data.type)) {
            throw new utils_1.ValidationError("Ce type de document n'est pas autorisé pour cette catégorie", { type: ["not allowed for category"] });
        }
    }
    if (data.demandeId && data.requirementId) {
        const [req] = await db
            .select({ id: demandes_1.demandeRequirements.id })
            .from(demandes_1.demandeRequirements)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(demandes_1.demandeRequirements.id, data.requirementId), (0, drizzle_orm_1.eq)(demandes_1.demandeRequirements.demandeId, data.demandeId)));
        if (!req)
            throw new utils_1.ValidationError("Ce prérequis n'appartient pas à ce dossier.", { requirementId: ["not in demande"] });
    }
    const fileId = newId("file");
    const key = `documents/${fileId}/${sanitizeFilename(originalName)}`;
    const checksum = crypto_1.default.createHash("sha256").update(fileBuffer).digest("hex");
    await (0, storage_1.uploadObject)(key, fileBuffer, mimeType);
    const [file] = await db
        .insert(documents_1.storedFiles)
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
        .insert(documents_1.documents)
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
    await db.insert(documents_1.documentVersions).values({
        id: newId("dver"),
        documentId: doc.id,
        fileId: file.id,
        version: 1,
        createdBy: actor.userId,
    });
    if (data.demandeId) {
        await db.insert(demandes_1.demandeDocuments).values({
            id: newId("ddoc"),
            demandeId: data.demandeId,
            documentId: doc.id,
            requirementId: data.requirementId ?? null,
            isPrimary: !!data.requirementId,
        });
        if (data.requirementId) {
            await db
                .update(demandes_1.demandeRequirements)
                .set({ status: "PROVIDED", providedDocumentId: doc.id })
                .where((0, drizzle_orm_1.eq)(demandes_1.demandeRequirements.id, data.requirementId));
        }
        await (0, demandes_2.recordComplementProvided)(db, data.demandeId, actor, "document");
    }
    await writeDocumentAudit(db, { documentId: doc.id, action: "UPLOAD", actor, ipAddress: ip, userAgent, details: { fileName: originalName } });
    return enrichDocument(db, doc);
}
async function downloadDocument(db, id, actor, ip, userAgent) {
    const doc = await getDocument(db, id);
    if (!doc.file)
        throw new utils_1.NotFoundError("Fichier introuvable");
    const { buffer, contentType } = await (0, storage_1.getObject)(doc.file.path);
    await writeDocumentAudit(db, { documentId: id, action: "DOWNLOAD", actor, ipAddress: ip, userAgent });
    return { buffer, contentType: contentType ?? doc.file.mimeType, filename: doc.file.originalName };
}
async function deleteDocument(db, id, actor) {
    const [existing] = await db.select().from(documents_1.documents).where((0, drizzle_orm_1.eq)(documents_1.documents.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Document introuvable");
    if (existing.status !== "UPLOADED") {
        throw new utils_1.ValidationError("Ce document a déjà été examiné et ne peut plus être supprimé.", { status: ["already reviewed"] });
    }
    await db.delete(documents_1.documents).where((0, drizzle_orm_1.eq)(documents_1.documents.id, id));
    await writeDocumentAudit(db, { documentId: id, action: "DELETE", actor, details: { reason: "self-service" } });
}
//# sourceMappingURL=documents.js.map