"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campagneInteractions = exports.campagneDeliveries = exports.campagneAttachments = exports.campagnes = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const services_1 = require("./services");
const documents_1 = require("./documents");
exports.campagnes = services_1.ambassade.table("campagnes", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    title: (0, pg_core_1.varchar)("title", { length: 255 }).notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 20 }).notNull(),
    coverImageId: (0, pg_core_1.text)("cover_image_id").references(() => documents_1.storedFiles.id),
    targetFilters: (0, pg_core_1.jsonb)("target_filters").notNull().default({}),
    channels: (0, pg_core_1.jsonb)("channels").notNull().default([]),
    scheduledAt: (0, pg_core_1.timestamp)("scheduled_at"),
    sentAt: (0, pg_core_1.timestamp)("sent_at"),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("DRAFT"),
    sentBy: (0, pg_core_1.uuid)("sent_by").notNull(),
    statsTotalRecipients: (0, pg_core_1.integer)("stats_total_recipients").notNull().default(0),
    statsSent: (0, pg_core_1.integer)("stats_sent").notNull().default(0),
    statsDelivered: (0, pg_core_1.integer)("stats_delivered").notNull().default(0),
    statsOpened: (0, pg_core_1.integer)("stats_opened").notNull().default(0),
    statsClicked: (0, pg_core_1.integer)("stats_clicked").notNull().default(0),
    statsFailed: (0, pg_core_1.integer)("stats_failed").notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.campagneAttachments = services_1.ambassade.table("campagne_attachments", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    campagneId: (0, pg_core_1.text)("campagne_id")
        .notNull()
        .references(() => exports.campagnes.id, { onDelete: "cascade" }),
    fileId: (0, pg_core_1.text)("file_id")
        .notNull()
        .references(() => documents_1.storedFiles.id),
    type: (0, pg_core_1.varchar)("type", { length: 20 }).notNull(),
    order: (0, pg_core_1.integer)("order").notNull().default(0),
    caption: (0, pg_core_1.text)("caption"),
    isBanner: (0, pg_core_1.boolean)("is_banner").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.campagneDeliveries = services_1.ambassade.table("campagne_deliveries", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    campagneId: (0, pg_core_1.text)("campagne_id")
        .notNull()
        .references(() => exports.campagnes.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    channel: (0, pg_core_1.varchar)("channel", { length: 20 }).notNull(),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("QUEUED"),
    sentAt: (0, pg_core_1.timestamp)("sent_at"),
    deliveredAt: (0, pg_core_1.timestamp)("delivered_at"),
    openedAt: (0, pg_core_1.timestamp)("opened_at"),
    clickedAt: (0, pg_core_1.timestamp)("clicked_at"),
    errorMessage: (0, pg_core_1.text)("error_message"),
});
exports.campagneInteractions = services_1.ambassade.table("campagne_interactions", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    campagneId: (0, pg_core_1.text)("campagne_id")
        .notNull()
        .references(() => exports.campagnes.id, { onDelete: "cascade" }),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 20 }).notNull(),
    targetId: (0, pg_core_1.text)("target_id"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
}, (t) => [
    (0, pg_core_1.index)("campagne_interactions_campagne_type_idx").on(t.campagneId, t.type),
    (0, pg_core_1.uniqueIndex)("campagne_interactions_reaction_uq")
        .on(t.campagneId, t.userId, t.type)
        .where((0, drizzle_orm_1.sql) `${t.type} in ('LIKE','PARTICIPATE')`),
]);
//# sourceMappingURL=campagnes.js.map