import { pgSchema, text, varchar, timestamp, jsonb, uuid } from "drizzle-orm/pg-core";

// Same physical table as ambassade-api's schema.audit.ts (owning service,
// hosts GET /audit/*) — identity-api only ever INSERTs into it (LOGIN,
// LOGIN_ATTEMPT, role/agent changes), cross-schema write over the shared
// "poramma" database. Intentionally NOT part of this service's drizzle
// config: migrations for this table are generated/owned by ambassade-api.
const audit = pgSchema("audit");

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
