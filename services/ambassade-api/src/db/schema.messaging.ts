import { text, varchar, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import { ambassade } from "./schema.ambassade";
import { demandes } from "./schema.demandes";

// --- MESSAGERIE INTERNE (agent ↔ agent, optionnellement liée à une
// demande pour le contexte) — distincte de l'espace d'échange citoyen
// ↔ agents déjà en place sur demandes/rendez-vous (demande_comments,
// rendez_vous_notes) : celui-ci est staff-only, jamais exposé au citoyen.
// Volontairement PAS de carte blanche ADMIN ici (contrairement aux
// demandes/documents/rendez-vous) — la messagerie interne reste une
// conversation privée entre ses participants, pas une ressource
// opérationnelle que l'ADMIN doit pouvoir superviser sans y être invité.
export const threads = ambassade.table("threads", {
  id: text("id").primaryKey(),
  demandeId: text("demande_id").references(() => demandes.id),
  subject: varchar("subject", { length: 255 }).notNull(),
  type: varchar("type", { length: 20 }).notNull().default("GENERAL"),
  status: varchar("status", { length: 20 }).notNull().default("OPEN"),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const threadParticipants = ambassade.table("thread_participants", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("AGENT"),
  joinedAt: timestamp("joined_at").defaultNow(),
  // Pilote le compteur "non lus" (GET /threads) : nombre de messages du
  // thread postés après cette date par quelqu'un d'autre que soi-même.
  // Volontairement pas de statut READ par message individuel (ambigu dans
  // un thread à plusieurs participants — "lu par qui ?") : voir le
  // commentaire de listThreads dans messaging.service.ts.
  lastReadAt: timestamp("last_read_at"),
});

export const messages = ambassade.table("messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => threads.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id").notNull(),
  body: text("body").notNull(),
  // Tableau d'ids `stored_files` (même pipeline de stockage chiffré que les
  // pièces jointes de campagne/documents) — jamais de chemin MinIO direct.
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at").defaultNow(),
});
