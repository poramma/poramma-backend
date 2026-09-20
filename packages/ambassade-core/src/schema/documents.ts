import { text, varchar, boolean, integer, timestamp, jsonb, uuid, date } from "drizzle-orm/pg-core";
import { ambassade } from "./services";

// --- DOCUMENT CATEGORIES (config admin — allowedTypes/validation/retention) ---
export const documentCategories = ambassade.table("document_categories", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  allowedTypes: jsonb("allowed_types").notNull(),
  requiresValidation: boolean("requires_validation").default(true),
  maxVersions: integer("max_versions").default(3),
  retentionDays: integer("retention_days"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- STORED FILES (physical object in MinIO — one row per uploaded blob) ---
export const storedFiles = ambassade.table("stored_files", {
  id: text("id").primaryKey(),
  path: text("path").notNull(),
  mimeType: varchar("mime_type", { length: 150 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  checksum: varchar("checksum", { length: 64 }).notNull(),
  size: integer("size").notNull(),
  uploadedBy: uuid("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

// --- DOCUMENTS (citizen-facing GED record) ---
export const documents = ambassade.table("documents", {
  id: text("id").primaryKey(),
  ownerUserId: uuid("owner_user_id").notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  categoryId: text("category_id").references(() => documentCategories.id),
  fileId: text("file_id")
    .notNull()
    .references(() => storedFiles.id),
  status: varchar("status", { length: 20 }).notNull().default("UPLOADED"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  expiryDate: date("expiry_date"),
  version: integer("version").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- DOCUMENT VERSIONS (append-only history) ---
export const documentVersions = ambassade.table("document_versions", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  fileId: text("file_id")
    .notNull()
    .references(() => storedFiles.id),
  version: integer("version").notNull(),
  changeNote: text("change_note"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- DOCUMENT AUDIT LOGS ---
export const documentAuditLogs = ambassade.table("document_audit_logs", {
  id: text("id").primaryKey(),
  documentId: text("document_id").notNull(),
  documentKind: varchar("document_kind", { length: 30 }).notNull().default("STUDENT_DOCUMENT"),
  action: varchar("action", { length: 20 }).notNull(),
  actorUserId: uuid("actor_user_id").notNull(),
  actorName: varchar("actor_name", { length: 255 }),
  actorRole: varchar("actor_role", { length: 50 }),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: text("user_agent"),
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow(),
});
