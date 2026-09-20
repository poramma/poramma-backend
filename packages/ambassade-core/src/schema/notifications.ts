import { text, varchar, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";
import { ambassade } from "./services";

/**
 * Notifications in-app, par utilisateur. Alimentées par les campagnes
 * (canal IN_APP), les changements de statut de demande et les rendez-vous.
 * Les migrations restent gérées par ambassade-api (voir schema.communication.ts).
 */
export const notifications = ambassade.table("notifications", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  payload: jsonb("payload"),
  channel: varchar("channel", { length: 20 }).notNull().default("IN_APP"),
  status: varchar("status", { length: 20 }).notNull().default("SENT"),
  actionUrl: text("action_url"),
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  readAt: timestamp("read_at"),
});
