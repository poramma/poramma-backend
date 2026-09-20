"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messages = exports.threadParticipants = exports.threads = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_ambassade_1 = require("./schema.ambassade");
const schema_demandes_1 = require("./schema.demandes");
exports.threads = schema_ambassade_1.ambassade.table("threads", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    demandeId: (0, pg_core_1.text)("demande_id").references(() => schema_demandes_1.demandes.id),
    subject: (0, pg_core_1.varchar)("subject", { length: 255 }).notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 20 }).notNull().default("GENERAL"),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("OPEN"),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    closedAt: (0, pg_core_1.timestamp)("closed_at"),
});
exports.threadParticipants = schema_ambassade_1.ambassade.table("thread_participants", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    threadId: (0, pg_core_1.text)("thread_id")
        .notNull()
        .references(() => exports.threads.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    role: (0, pg_core_1.varchar)("role", { length: 20 }).notNull().default("AGENT"),
    joinedAt: (0, pg_core_1.timestamp)("joined_at").defaultNow(),
    lastReadAt: (0, pg_core_1.timestamp)("last_read_at"),
});
exports.messages = schema_ambassade_1.ambassade.table("messages", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    threadId: (0, pg_core_1.text)("thread_id")
        .notNull()
        .references(() => exports.threads.id, { onDelete: "cascade" }),
    senderId: (0, pg_core_1.uuid)("sender_id").notNull(),
    body: (0, pg_core_1.text)("body").notNull(),
    attachments: (0, pg_core_1.jsonb)("attachments"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
//# sourceMappingURL=schema.messaging.js.map