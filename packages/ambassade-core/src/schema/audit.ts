import { pgSchema, text, varchar, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

// Journal d'audit général, multi-entités (LOGIN, DEMANDE, RENDEZ_VOUS,
// ETUDIANT, ...). Vit dans son propre schéma `audit` (pas `ambassade`) car
// identity-api écrit aussi directement dedans (cross-schema write, même
// pattern que les tables ci-dessous). ambassade-api reste propriétaire des
// migrations pour cette table.
export const audit = pgSchema("audit");

export const auditLogs = audit.table("audit_logs", {
  id: text("id").primaryKey(),
  at: timestamp("at").defaultNow().notNull(),
  actorUserId: uuid("actor_user_id"),
  actorRole: varchar("actor_role", { length: 50 }),
  action: varchar("action", { length: 50 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: text("entity_id").notNull(),
  entitySnapshot: jsonb("entity_snapshot"),
  result: varchar("result", { length: 20 }).notNull().default("SUCCESS"),
  details: jsonb("details"),
  ip: varchar("ip", { length: 64 }),
  ua: text("ua"),
  sessionId: text("session_id"),
  severity: varchar("severity", { length: 20 }).notNull().default("INFO"),
});
