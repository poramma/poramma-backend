"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadDocument = exports.uploadDocument = exports.getDocumentOwnerId = exports.getDocument = exports.listDocuments = void 0;
exports.listCategories = listCategories;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.deleteCategory = deleteCategory;
exports.logView = logView;
exports.listAudit = listAudit;
exports.addDocumentVersion = addDocumentVersion;
exports.listVersions = listVersions;
exports.validateDocument = validateDocument;
exports.archiveDocument = archiveDocument;
exports.getStats = getStats;
const crypto_1 = __importDefault(require("crypto"));
const connection_1 = require("../../db/connection");
const schema_documents_1 = require("../../db/schema.documents");
const schema_demandes_1 = require("../../db/schema.demandes");
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const storage_1 = require("@poramma/storage");
const enrich_1 = require("../../shared/enrich");
const ambassade_core_1 = require("@poramma/ambassade-core");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-150);
}
async function listCategories() {
    return connection_1.db.select().from(schema_documents_1.documentCategories);
}
async function createCategory(data) {
    const [row] = await connection_1.db
        .insert(schema_documents_1.documentCategories)
        .values({ id: newId("cat"), ...data })
        .returning();
    return row;
}
async function updateCategory(id, data) {
    const [existing] = await connection_1.db.select().from(schema_documents_1.documentCategories).where((0, drizzle_orm_1.eq)(schema_documents_1.documentCategories.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Catégorie introuvable");
    const [updated] = await connection_1.db.update(schema_documents_1.documentCategories).set(data).where((0, drizzle_orm_1.eq)(schema_documents_1.documentCategories.id, id)).returning();
    return updated;
}
async function deleteCategory(id) {
    const [existing] = await connection_1.db.select().from(schema_documents_1.documentCategories).where((0, drizzle_orm_1.eq)(schema_documents_1.documentCategories.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Catégorie introuvable");
    await connection_1.db.delete(schema_documents_1.documentCategories).where((0, drizzle_orm_1.eq)(schema_documents_1.documentCategories.id, id));
}
async function writeAudit(params) {
    await connection_1.db.insert(schema_documents_1.documentAuditLogs).values({
        id: newId("aud"),
        documentId: params.documentId,
        documentKind: params.documentKind ?? "STUDENT_DOCUMENT",
        action: params.action,
        actorUserId: params.actor.userId,
        actorName: await (0, enrich_1.getActorName)(params.actor.userId),
        actorRole: params.actor.roleName,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        details: params.details ?? null,
    });
}
async function logView(documentId, actor, ip, userAgent) {
    await writeAudit({ documentId, action: "VIEW", actor, ipAddress: ip, userAgent });
}
async function listAudit(documentId, limit) {
    const conditions = documentId ? [(0, drizzle_orm_1.eq)(schema_documents_1.documentAuditLogs.documentId, documentId)] : [];
    return connection_1.db
        .select()
        .from(schema_documents_1.documentAuditLogs)
        .where(conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined)
        .orderBy((0, drizzle_orm_1.desc)(schema_documents_1.documentAuditLogs.createdAt))
        .limit(limit);
}
async function enrichDocument(row) {
    const [file, owner, category, reviewedByUser] = await Promise.all([
        connection_1.db
            .select()
            .from(schema_documents_1.storedFiles)
            .where((0, drizzle_orm_1.eq)(schema_documents_1.storedFiles.id, row.fileId))
            .then((r) => r[0] ?? null),
        (0, enrich_1.getUser)(row.ownerUserId),
        row.categoryId
            ? connection_1.db
                .select()
                .from(schema_documents_1.documentCategories)
                .where((0, drizzle_orm_1.eq)(schema_documents_1.documentCategories.id, row.categoryId))
                .then((r) => r[0] ?? null)
            : Promise.resolve(null),
        row.reviewedBy ? (0, enrich_1.getUser)(row.reviewedBy) : Promise.resolve(null),
    ]);
    return { ...row, previousVersionId: null, file: file ? { ...file, encryptionKeyId: null } : null, owner, category, reviewedByUser };
}
const listDocuments = (query) => ambassade_core_1.documentsLogic.listDocuments(connection_1.db, query);
exports.listDocuments = listDocuments;
const getDocument = (id) => ambassade_core_1.documentsLogic.getDocument(connection_1.db, id);
exports.getDocument = getDocument;
const getDocumentOwnerId = (id) => ambassade_core_1.documentsLogic.getDocumentOwnerId(connection_1.db, id);
exports.getDocumentOwnerId = getDocumentOwnerId;
const uploadDocument = (fileBuffer, originalName, mimeType, data, actor, ip, userAgent) => ambassade_core_1.documentsLogic.uploadDocument(connection_1.db, fileBuffer, originalName, mimeType, data, actor, ip, userAgent);
exports.uploadDocument = uploadDocument;
async function addDocumentVersion(documentId, fileBuffer, originalName, mimeType, changeNote, actor) {
    const [existing] = await connection_1.db.select().from(schema_documents_1.documents).where((0, drizzle_orm_1.eq)(schema_documents_1.documents.id, documentId));
    if (!existing)
        throw new utils_1.NotFoundError("Document introuvable");
    if (existing.categoryId) {
        const [category] = await connection_1.db.select().from(schema_documents_1.documentCategories).where((0, drizzle_orm_1.eq)(schema_documents_1.documentCategories.id, existing.categoryId));
        if (category?.maxVersions && existing.version >= category.maxVersions) {
            throw new utils_1.ValidationError("Nombre maximum de versions atteint pour cette catégorie", { version: ["max versions reached"] });
        }
    }
    const fileId = newId("file");
    const key = `documents/${fileId}/${sanitizeFilename(originalName)}`;
    const checksum = crypto_1.default.createHash("sha256").update(fileBuffer).digest("hex");
    await (0, storage_1.uploadObject)(key, fileBuffer, mimeType);
    const [file] = await connection_1.db
        .insert(schema_documents_1.storedFiles)
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
    const [updated] = await connection_1.db
        .update(schema_documents_1.documents)
        .set({ fileId: file.id, version: newVersion, status: "UPLOADED", reviewedBy: null, reviewedAt: null, reviewNote: null, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_documents_1.documents.id, documentId))
        .returning();
    await connection_1.db.insert(schema_documents_1.documentVersions).values({
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
async function listVersions(documentId) {
    const rows = await connection_1.db.select().from(schema_documents_1.documentVersions).where((0, drizzle_orm_1.eq)(schema_documents_1.documentVersions.documentId, documentId)).orderBy((0, drizzle_orm_1.desc)(schema_documents_1.documentVersions.version));
    return Promise.all(rows.map(async (v) => {
        const [file] = await connection_1.db.select().from(schema_documents_1.storedFiles).where((0, drizzle_orm_1.eq)(schema_documents_1.storedFiles.id, v.fileId));
        return { ...v, file: file ? { ...file, encryptionKeyId: null } : null };
    }));
}
const downloadDocument = (id, actor, ip, userAgent) => ambassade_core_1.documentsLogic.downloadDocument(connection_1.db, id, actor, ip, userAgent);
exports.downloadDocument = downloadDocument;
async function validateDocument(id, status, reviewNote, actor) {
    const [existing] = await connection_1.db.select().from(schema_documents_1.documents).where((0, drizzle_orm_1.eq)(schema_documents_1.documents.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Document introuvable");
    const [updated] = await connection_1.db
        .update(schema_documents_1.documents)
        .set({ status, reviewNote: reviewNote ?? null, reviewedBy: actor.userId, reviewedAt: new Date(), updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_documents_1.documents.id, id))
        .returning();
    const [link] = await connection_1.db.select().from(schema_demandes_1.demandeDocuments).where((0, drizzle_orm_1.eq)(schema_demandes_1.demandeDocuments.documentId, id));
    if (link?.requirementId) {
        await connection_1.db
            .update(schema_demandes_1.demandeRequirements)
            .set({ status: status === "ACCEPTED" ? "ACCEPTED" : "REJECTED", reviewerNote: reviewNote ?? null, reviewedBy: actor.userId, reviewedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_demandes_1.demandeRequirements.id, link.requirementId));
    }
    await writeAudit({ documentId: id, action: status === "ACCEPTED" ? "VALIDATE" : "REJECT", actor, details: { reviewNote } });
    return enrichDocument(updated);
}
async function archiveDocument(id, actor) {
    const [existing] = await connection_1.db.select().from(schema_documents_1.documents).where((0, drizzle_orm_1.eq)(schema_documents_1.documents.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Document introuvable");
    const [updated] = await connection_1.db.update(schema_documents_1.documents).set({ status: "EXPIRED", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_documents_1.documents.id, id)).returning();
    await writeAudit({ documentId: id, action: "DELETE", actor, details: { reason: "archived" } });
    return enrichDocument(updated);
}
async function getStats() {
    const rows = await connection_1.db.select().from(schema_documents_1.documents);
    const totalPending = rows.filter((d) => d.status === "UPLOADED" || d.status === "IN_REVIEW").length;
    const totalAccepted = rows.filter((d) => d.status === "ACCEPTED").length;
    const totalRejected = rows.filter((d) => d.status === "REJECTED").length;
    const reviewed = rows.filter((d) => d.reviewedAt && d.createdAt);
    const averageReviewTimeHours = reviewed.length
        ? reviewed.reduce((sum, d) => sum + (new Date(d.reviewedAt).getTime() - new Date(d.createdAt).getTime()) / 3_600_000, 0) / reviewed.length
        : 0;
    const expiringSoonCount = rows.filter((d) => {
        if (!d.expiryDate)
            return false;
        const days = (new Date(d.expiryDate).getTime() - Date.now()) / 86_400_000;
        return days >= 0 && days <= 30;
    }).length;
    const byType = Object.entries(rows.reduce((acc, d) => {
        acc[d.type] = (acc[d.type] ?? 0) + 1;
        return acc;
    }, {})).map(([type, count]) => ({ type, count }));
    const byStatus = Object.entries(rows.reduce((acc, d) => {
        acc[d.status] = (acc[d.status] ?? 0) + 1;
        return acc;
    }, {})).map(([status, count]) => ({ status, count }));
    const recentActivity = await connection_1.db.select().from(schema_documents_1.documentAuditLogs).orderBy((0, drizzle_orm_1.desc)(schema_documents_1.documentAuditLogs.createdAt)).limit(10);
    return { totalPending, totalAccepted, totalRejected, averageReviewTimeHours, expiringSoonCount, byType, byStatus, recentActivity };
}
//# sourceMappingURL=documents.service.js.map