"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cultureMessages = exports.cultureThreads = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const services_1 = require("./services");
exports.cultureThreads = services_1.ambassade.table("culture_threads", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    reference: (0, pg_core_1.varchar)("reference", { length: 30 }).notNull().unique(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    advisorId: (0, pg_core_1.uuid)("advisor_id"),
    subject: (0, pg_core_1.varchar)("subject", { length: 150 }).notNull(),
    status: (0, pg_core_1.varchar)("status", { length: 10 }).notNull().default("OPEN"),
    lastMessageAt: (0, pg_core_1.timestamp)("last_message_at").defaultNow(),
    lastMessageBy: (0, pg_core_1.varchar)("last_message_by", { length: 10 }).notNull().default("USER"),
    closedAt: (0, pg_core_1.timestamp)("closed_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (t) => [(0, pg_core_1.index)("culture_threads_status_idx").on(t.status, t.lastMessageAt), (0, pg_core_1.index)("culture_threads_user_idx").on(t.userId)]);
exports.cultureMessages = services_1.ambassade.table("culture_messages", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    threadId: (0, pg_core_1.text)("thread_id")
        .notNull()
        .references(() => exports.cultureThreads.id, { onDelete: "cascade" }),
    authorId: (0, pg_core_1.uuid)("author_id"),
    authorType: (0, pg_core_1.varchar)("author_type", { length: 10 }).notNull(),
    authorName: (0, pg_core_1.varchar)("author_name", { length: 150 }),
    content: (0, pg_core_1.text)("content").notNull(),
    isInternal: (0, pg_core_1.boolean)("is_internal").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (t) => [(0, pg_core_1.index)("culture_messages_thread_idx").on(t.threadId, t.createdAt)]);
//# sourceMappingURL=culture.js.map