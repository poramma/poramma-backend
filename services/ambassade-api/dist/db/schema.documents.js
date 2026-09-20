"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.internalDocuments = exports.documentAuditLogs = exports.documentVersions = exports.documents = exports.storedFiles = exports.documentCategories = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_ambassade_1 = require("./schema.ambassade");
const ambassade_core_1 = require("@poramma/ambassade-core");
exports.documentCategories = ambassade_core_1.documentsSchema.documentCategories;
exports.storedFiles = ambassade_core_1.documentsSchema.storedFiles;
exports.documents = ambassade_core_1.documentsSchema.documents;
exports.documentVersions = ambassade_core_1.documentsSchema.documentVersions;
exports.documentAuditLogs = ambassade_core_1.documentsSchema.documentAuditLogs;
exports.internalDocuments = schema_ambassade_1.ambassade.table("internal_documents", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    fileId: (0, pg_core_1.text)("file_id")
        .notNull()
        .references(() => exports.storedFiles.id),
    department: (0, pg_core_1.varchar)("department", { length: 30 }).notNull(),
    confidentiality: (0, pg_core_1.varchar)("confidentiality", { length: 20 }).notNull().default("INTERNAL"),
    targetRoleIds: (0, pg_core_1.jsonb)("target_role_ids"),
    targetAgentIds: (0, pg_core_1.jsonb)("target_agent_ids"),
    tags: (0, pg_core_1.jsonb)("tags").notNull().default([]),
    version: (0, pg_core_1.integer)("version").notNull().default(1),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
});
//# sourceMappingURL=schema.documents.js.map