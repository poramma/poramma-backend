"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.demandeComments = exports.demandeHistories = exports.demandeDocuments = exports.demandeRequirements = exports.demandes = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const services_1 = require("./services");
exports.demandes = services_1.ambassade.table("demandes", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    subServiceId: (0, pg_core_1.text)("sub_service_id")
        .notNull()
        .references(() => services_1.subServices.id),
    assignedAgentId: (0, pg_core_1.uuid)("assigned_agent_id"),
    dossierNumber: (0, pg_core_1.varchar)("dossier_number", { length: 50 }).notNull().unique(),
    status: (0, pg_core_1.varchar)("status", { length: 30 }).notNull().default("SUBMITTED"),
    priority: (0, pg_core_1.varchar)("priority", { length: 10 }).notNull().default("NORMAL"),
    totalAmount: (0, pg_core_1.decimal)("total_amount", { precision: 10, scale: 2 }),
    currency: (0, pg_core_1.varchar)("currency", { length: 10 }),
    customPayload: (0, pg_core_1.jsonb)("custom_payload"),
    submittedAt: (0, pg_core_1.timestamp)("submitted_at"),
    assignedAt: (0, pg_core_1.timestamp)("assigned_at"),
    deadlineAt: (0, pg_core_1.timestamp)("deadline_at"),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.demandeRequirements = services_1.ambassade.table("demande_requirements", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    demandeId: (0, pg_core_1.text)("demande_id")
        .notNull()
        .references(() => exports.demandes.id, { onDelete: "cascade" }),
    requirementId: (0, pg_core_1.text)("requirement_id")
        .notNull()
        .references(() => services_1.requirements.id),
    label: (0, pg_core_1.varchar)("label", { length: 255 }).notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 20 }).notNull(),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("PENDING"),
    providedValue: (0, pg_core_1.text)("provided_value"),
    providedDocumentId: (0, pg_core_1.text)("provided_document_id"),
    reviewerNote: (0, pg_core_1.text)("reviewer_note"),
    reviewedBy: (0, pg_core_1.uuid)("reviewed_by"),
    reviewedAt: (0, pg_core_1.timestamp)("reviewed_at"),
});
exports.demandeDocuments = services_1.ambassade.table("demande_documents", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    demandeId: (0, pg_core_1.text)("demande_id")
        .notNull()
        .references(() => exports.demandes.id, { onDelete: "cascade" }),
    documentId: (0, pg_core_1.text)("document_id").notNull(),
    requirementId: (0, pg_core_1.text)("requirement_id"),
    isPrimary: (0, pg_core_1.boolean)("is_primary").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.demandeHistories = services_1.ambassade.table("demande_histories", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    demandeId: (0, pg_core_1.text)("demande_id")
        .notNull()
        .references(() => exports.demandes.id, { onDelete: "cascade" }),
    action: (0, pg_core_1.varchar)("action", { length: 20 }).notNull().default("STATUS_CHANGE"),
    fromStatus: (0, pg_core_1.varchar)("from_status", { length: 30 }),
    toStatus: (0, pg_core_1.varchar)("to_status", { length: 30 }).notNull(),
    actorUserId: (0, pg_core_1.uuid)("actor_user_id").notNull(),
    actorRole: (0, pg_core_1.varchar)("actor_role", { length: 50 }),
    actorName: (0, pg_core_1.varchar)("actor_name", { length: 255 }),
    comment: (0, pg_core_1.text)("comment"),
    isVisibleToUser: (0, pg_core_1.boolean)("is_visible_to_user").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.demandeComments = services_1.ambassade.table("demande_comments", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    demandeId: (0, pg_core_1.text)("demande_id")
        .notNull()
        .references(() => exports.demandes.id, { onDelete: "cascade" }),
    authorId: (0, pg_core_1.uuid)("author_id").notNull(),
    authorName: (0, pg_core_1.varchar)("author_name", { length: 255 }),
    authorType: (0, pg_core_1.varchar)("author_type", { length: 10 }).notNull().default("AGENT"),
    content: (0, pg_core_1.text)("content").notNull(),
    isInternal: (0, pg_core_1.boolean)("is_internal").default(true),
    attachments: (0, pg_core_1.jsonb)("attachments"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
//# sourceMappingURL=demandes.js.map