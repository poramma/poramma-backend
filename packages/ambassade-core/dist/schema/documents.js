"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentAuditLogs = exports.documentVersions = exports.documents = exports.storedFiles = exports.documentCategories = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const services_1 = require("./services");
exports.documentCategories = services_1.ambassade.table("document_categories", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    code: (0, pg_core_1.varchar)("code", { length: 100 }).notNull().unique(),
    description: (0, pg_core_1.text)("description"),
    allowedTypes: (0, pg_core_1.jsonb)("allowed_types").notNull(),
    requiresValidation: (0, pg_core_1.boolean)("requires_validation").default(true),
    maxVersions: (0, pg_core_1.integer)("max_versions").default(3),
    retentionDays: (0, pg_core_1.integer)("retention_days"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.storedFiles = services_1.ambassade.table("stored_files", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    path: (0, pg_core_1.text)("path").notNull(),
    mimeType: (0, pg_core_1.varchar)("mime_type", { length: 150 }).notNull(),
    originalName: (0, pg_core_1.varchar)("original_name", { length: 255 }).notNull(),
    checksum: (0, pg_core_1.varchar)("checksum", { length: 64 }).notNull(),
    size: (0, pg_core_1.integer)("size").notNull(),
    uploadedBy: (0, pg_core_1.uuid)("uploaded_by").notNull(),
    uploadedAt: (0, pg_core_1.timestamp)("uploaded_at").defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
});
exports.documents = services_1.ambassade.table("documents", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    ownerUserId: (0, pg_core_1.uuid)("owner_user_id").notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 30 }).notNull(),
    categoryId: (0, pg_core_1.text)("category_id").references(() => exports.documentCategories.id),
    fileId: (0, pg_core_1.text)("file_id")
        .notNull()
        .references(() => exports.storedFiles.id),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("UPLOADED"),
    reviewedBy: (0, pg_core_1.uuid)("reviewed_by"),
    reviewedAt: (0, pg_core_1.timestamp)("reviewed_at"),
    reviewNote: (0, pg_core_1.text)("review_note"),
    expiryDate: (0, pg_core_1.date)("expiry_date"),
    version: (0, pg_core_1.integer)("version").notNull().default(1),
    notes: (0, pg_core_1.text)("notes"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.documentVersions = services_1.ambassade.table("document_versions", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    documentId: (0, pg_core_1.text)("document_id")
        .notNull()
        .references(() => exports.documents.id, { onDelete: "cascade" }),
    fileId: (0, pg_core_1.text)("file_id")
        .notNull()
        .references(() => exports.storedFiles.id),
    version: (0, pg_core_1.integer)("version").notNull(),
    changeNote: (0, pg_core_1.text)("change_note"),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.documentAuditLogs = services_1.ambassade.table("document_audit_logs", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    documentId: (0, pg_core_1.text)("document_id").notNull(),
    documentKind: (0, pg_core_1.varchar)("document_kind", { length: 30 }).notNull().default("STUDENT_DOCUMENT"),
    action: (0, pg_core_1.varchar)("action", { length: 20 }).notNull(),
    actorUserId: (0, pg_core_1.uuid)("actor_user_id").notNull(),
    actorName: (0, pg_core_1.varchar)("actor_name", { length: 255 }),
    actorRole: (0, pg_core_1.varchar)("actor_role", { length: 50 }),
    ipAddress: (0, pg_core_1.varchar)("ip_address", { length: 64 }),
    userAgent: (0, pg_core_1.text)("user_agent"),
    details: (0, pg_core_1.jsonb)("details"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
//# sourceMappingURL=documents.js.map