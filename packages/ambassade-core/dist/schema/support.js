"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supportTicketMessages = exports.supportTickets = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const services_1 = require("./services");
exports.supportTickets = services_1.ambassade.table("support_tickets", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    reference: (0, pg_core_1.varchar)("reference", { length: 30 }).notNull().unique(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    category: (0, pg_core_1.varchar)("category", { length: 20 }).notNull(),
    subject: (0, pg_core_1.varchar)("subject", { length: 150 }).notNull(),
    linkedReference: (0, pg_core_1.varchar)("linked_reference", { length: 60 }),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("OPEN"),
    priority: (0, pg_core_1.varchar)("priority", { length: 10 }).notNull().default("NORMAL"),
    assignedTo: (0, pg_core_1.uuid)("assigned_to"),
    firstResponseAt: (0, pg_core_1.timestamp)("first_response_at"),
    resolvedAt: (0, pg_core_1.timestamp)("resolved_at"),
    closedAt: (0, pg_core_1.timestamp)("closed_at"),
    lastMessageAt: (0, pg_core_1.timestamp)("last_message_at").defaultNow(),
    lastMessageBy: (0, pg_core_1.varchar)("last_message_by", { length: 10 }).notNull().default("USER"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (t) => [
    (0, pg_core_1.index)("support_tickets_status_idx").on(t.status, t.lastMessageAt),
    (0, pg_core_1.index)("support_tickets_user_idx").on(t.userId),
    (0, pg_core_1.index)("support_tickets_assigned_idx").on(t.assignedTo),
]);
exports.supportTicketMessages = services_1.ambassade.table("support_ticket_messages", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    ticketId: (0, pg_core_1.text)("ticket_id")
        .notNull()
        .references(() => exports.supportTickets.id, { onDelete: "cascade" }),
    authorId: (0, pg_core_1.uuid)("author_id"),
    authorType: (0, pg_core_1.varchar)("author_type", { length: 10 }).notNull(),
    authorName: (0, pg_core_1.varchar)("author_name", { length: 150 }),
    content: (0, pg_core_1.text)("content").notNull(),
    isInternal: (0, pg_core_1.boolean)("is_internal").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (t) => [(0, pg_core_1.index)("support_ticket_messages_ticket_idx").on(t.ticketId, t.createdAt)]);
//# sourceMappingURL=support.js.map