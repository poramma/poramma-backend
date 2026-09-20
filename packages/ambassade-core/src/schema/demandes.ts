import { text, varchar, boolean, decimal, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { ambassade, subServices, requirements } from "./services";

// --- DEMANDES (dossiers consulaires) ---
// userId/assignedAgentId point at identity.users/identity.agents — même
// base Postgres, schéma différent. Pas de FK cross-schema (voir
// schema/identity.ts).
export const demandes = ambassade.table("demandes", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  subServiceId: text("sub_service_id")
    .notNull()
    .references(() => subServices.id),
  assignedAgentId: uuid("assigned_agent_id"),
  dossierNumber: varchar("dossier_number", { length: 50 }).notNull().unique(),
  status: varchar("status", { length: 30 }).notNull().default("SUBMITTED"),
  priority: varchar("priority", { length: 10 }).notNull().default("NORMAL"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }),
  customPayload: jsonb("custom_payload"),
  submittedAt: timestamp("submitted_at"),
  assignedAt: timestamp("assigned_at"),
  deadlineAt: timestamp("deadline_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- DEMANDE REQUIREMENTS (suivi par dossier des prérequis du sous-service) ---
export const demandeRequirements = ambassade.table("demande_requirements", {
  id: text("id").primaryKey(),
  demandeId: text("demande_id")
    .notNull()
    .references(() => demandes.id, { onDelete: "cascade" }),
  requirementId: text("requirement_id")
    .notNull()
    .references(() => requirements.id),
  label: varchar("label", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"),
  providedValue: text("provided_value"),
  providedDocumentId: text("provided_document_id"),
  reviewerNote: text("reviewer_note"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
});

// --- DEMANDE DOCUMENTS ---
export const demandeDocuments = ambassade.table("demande_documents", {
  id: text("id").primaryKey(),
  demandeId: text("demande_id")
    .notNull()
    .references(() => demandes.id, { onDelete: "cascade" }),
  documentId: text("document_id").notNull(),
  requirementId: text("requirement_id"),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- DEMANDE HISTORIES (audit trail du workflow) ---
export const demandeHistories = ambassade.table("demande_histories", {
  id: text("id").primaryKey(),
  demandeId: text("demande_id")
    .notNull()
    .references(() => demandes.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 20 }).notNull().default("STATUS_CHANGE"),
  fromStatus: varchar("from_status", { length: 30 }),
  toStatus: varchar("to_status", { length: 30 }).notNull(),
  actorUserId: uuid("actor_user_id").notNull(),
  actorRole: varchar("actor_role", { length: 50 }),
  actorName: varchar("actor_name", { length: 255 }),
  comment: text("comment"),
  isVisibleToUser: boolean("is_visible_to_user").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- DEMANDE COMMENTS ---
export const demandeComments = ambassade.table("demande_comments", {
  id: text("id").primaryKey(),
  demandeId: text("demande_id")
    .notNull()
    .references(() => demandes.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull(),
  authorName: varchar("author_name", { length: 255 }),
  authorType: varchar("author_type", { length: 10 }).notNull().default("AGENT"),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(true),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
