import { text, varchar, timestamp, uuid, boolean, index } from "drizzle-orm/pg-core";
import { ambassade } from "./services";

/**
 * Échanges directs entre un membre de la communauté et le Conseiller Culturel.
 * Contrairement aux autres services, l'échange se fait à visage découvert : le
 * membre voit le nom réel du conseiller, et inversement.
 */
export const cultureThreads = ambassade.table(
  "culture_threads",
  {
    id: text("id").primaryKey(),
    /** Numéro de suivi lisible (CUL-2026-3C1FE8). */
    reference: varchar("reference", { length: 30 }).notNull().unique(),
    userId: uuid("user_id").notNull(),
    /** Conseiller qui a répondu en premier (nom affiché au membre) ; null tant que personne n'a répondu. */
    advisorId: uuid("advisor_id"),
    subject: varchar("subject", { length: 150 }).notNull(),
    status: varchar("status", { length: 10 }).notNull().default("OPEN"), // OPEN (à traiter) | ANSWERED (répondu) | CLOSED
    lastMessageAt: timestamp("last_message_at").defaultNow(),
    lastMessageBy: varchar("last_message_by", { length: 10 }).notNull().default("USER"), // USER | ADVISOR
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("culture_threads_status_idx").on(t.status, t.lastMessageAt), index("culture_threads_user_idx").on(t.userId)]
);

export const cultureMessages = ambassade.table(
  "culture_messages",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => cultureThreads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id"),
    authorType: varchar("author_type", { length: 10 }).notNull(), // USER | ADVISOR | SYSTEM
    authorName: varchar("author_name", { length: 150 }),
    content: text("content").notNull(),
    /** true = note réservée au personnel (conseiller / administrateur), jamais montrée au membre. */
    isInternal: boolean("is_internal").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("culture_messages_thread_idx").on(t.threadId, t.createdAt)]
);
