import { text, varchar, timestamp, uuid, boolean, index } from "drizzle-orm/pg-core";
import { ambassade } from "./services";

/**
 * Tickets de support : un membre de la communauté écrit à l'ambassade, un
 * administrateur le traite (prise en charge, réponses, statut, priorité) et le
 * suivi complet reste visible des deux côtés (hors notes internes).
 */
export const supportTickets = ambassade.table(
  "support_tickets",
  {
    id: text("id").primaryKey(),
    /** Numéro de suivi lisible (SUP-2026-3C1FE8), communiqué à l'usager. */
    reference: varchar("reference", { length: 30 }).notNull().unique(),
    userId: uuid("user_id").notNull(),
    category: varchar("category", { length: 20 }).notNull(), // ACCOUNT | DEMANDE | RENDEZ_VOUS | REGISTRATION | TECHNICAL | OTHER
    subject: varchar("subject", { length: 150 }).notNull(),
    /** N° de dossier / de ticket de rendez-vous cité par l'usager (texte libre). */
    linkedReference: varchar("linked_reference", { length: 60 }),
    status: varchar("status", { length: 20 }).notNull().default("OPEN"), // OPEN | IN_PROGRESS | WAITING_USER | RESOLVED | CLOSED
    priority: varchar("priority", { length: 10 }).notNull().default("NORMAL"), // LOW | NORMAL | HIGH | URGENT
    assignedTo: uuid("assigned_to"),
    firstResponseAt: timestamp("first_response_at"),
    resolvedAt: timestamp("resolved_at"),
    closedAt: timestamp("closed_at"),
    lastMessageAt: timestamp("last_message_at").defaultNow(),
    lastMessageBy: varchar("last_message_by", { length: 10 }).notNull().default("USER"), // USER | STAFF
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("support_tickets_status_idx").on(t.status, t.lastMessageAt),
    index("support_tickets_user_idx").on(t.userId),
    index("support_tickets_assigned_idx").on(t.assignedTo),
  ]
);

/** Fil d'un ticket : messages de l'usager et des agents, notes internes, évènements de suivi (statut, assignation…). */
export const supportTicketMessages = ambassade.table(
  "support_ticket_messages",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    authorId: uuid("author_id"),
    authorType: varchar("author_type", { length: 10 }).notNull(), // USER | STAFF | SYSTEM
    authorName: varchar("author_name", { length: 150 }),
    content: text("content").notNull(),
    /** true = note interne, jamais montrée à l'usager. */
    isInternal: boolean("is_internal").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [index("support_ticket_messages_ticket_idx").on(t.ticketId, t.createdAt)]
);
