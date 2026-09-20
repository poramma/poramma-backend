import { text, varchar, boolean, integer, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { ambassade } from "./schema.ambassade";
import { documentsSchema } from "@poramma/ambassade-core";

// documentCategories/storedFiles/documents/documentVersions/
// documentAuditLogs vivent maintenant dans @poramma/ambassade-core
// (partagés avec communaute-api) — ré-exportés ici pour ne pas casser les
// imports existants. internalDocuments reste local (staff-only).
export const documentCategories = documentsSchema.documentCategories;
export const storedFiles = documentsSchema.storedFiles;
export const documents = documentsSchema.documents;
export const documentVersions = documentsSchema.documentVersions;
export const documentAuditLogs = documentsSchema.documentAuditLogs;

// --- INTERNAL DOCUMENTS (embassy-internal sharing — memos, letters — not
// tied to a citizen/student or a demande, own lifecycle) ---
// No document_versions-style history table for these yet (single-version
// only this round) — `version` always 1, kept for frontend type parity.
export const internalDocuments = ambassade.table("internal_documents", {
  id: text("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  fileId: text("file_id")
    .notNull()
    .references(() => storedFiles.id),
  department: varchar("department", { length: 30 }).notNull(),
  confidentiality: varchar("confidentiality", { length: 20 }).notNull().default("INTERNAL"),
  targetRoleIds: jsonb("target_role_ids"),
  targetAgentIds: jsonb("target_agent_ids"),
  tags: jsonb("tags").notNull().default([]),
  version: integer("version").notNull().default(1),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  archivedAt: timestamp("archived_at"),
});
