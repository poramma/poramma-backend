"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifications = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const services_1 = require("./services");
exports.notifications = services_1.ambassade.table("notifications", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 30 }).notNull(),
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    body: (0, pg_core_1.text)("body").notNull(),
    payload: (0, pg_core_1.jsonb)("payload"),
    channel: (0, pg_core_1.varchar)("channel", { length: 20 }).notNull().default("IN_APP"),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("SENT"),
    actionUrl: (0, pg_core_1.text)("action_url"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    sentAt: (0, pg_core_1.timestamp)("sent_at"),
    readAt: (0, pg_core_1.timestamp)("read_at"),
});
//# sourceMappingURL=notifications.js.map