import { pgSchema, text, uuid, boolean, integer, timestamp, time, date } from "drizzle-orm/pg-core";

// Read-only mirror of ambassade-api's agent-schedule tables — same physical
// database, different schema (mirror of ambassade-api's
// schema.identity-readonly.ts, in the opposite direction). identity-api
// never writes to these; this file is intentionally NOT part of any
// drizzle-kit config here, so migrations for it stay owned by ambassade-api.
const ambassade = pgSchema("ambassade");

export const agentServiceAssignments = ambassade.table("agent_service_assignments", {
  id: text("id").primaryKey(),
  agentId: uuid("agent_id").notNull(),
  subServiceId: text("sub_service_id").notNull(),
  assignedBy: uuid("assigned_by"),
  assignedAt: timestamp("assigned_at"),
  validFrom: date("valid_from"),
  validUntil: date("valid_until"),
  isPrimary: boolean("is_primary"),
  maxDailyAppointments: integer("max_daily_appointments"),
  notes: text("notes"),
  active: boolean("active"),
});

export const agentAvailabilities = ambassade.table("agent_availabilities", {
  id: text("id").primaryKey(),
  agentId: uuid("agent_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  isAvailable: boolean("is_available"),
  validFrom: date("valid_from"),
  validUntil: date("valid_until"),
});

export const agentExceptions = ambassade.table("agent_exceptions", {
  id: text("id").primaryKey(),
  agentId: uuid("agent_id").notNull(),
  date: date("date").notNull(),
  type: text("type").notNull(),
  reason: text("reason").notNull(),
  isFullDay: boolean("is_full_day"),
  startTime: time("start_time"),
  endTime: time("end_time"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at"),
});

// Catalogue des services (lecture seule) — sert à nommer les affectations d'un agent dans son profil.
export const services = ambassade.table("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
});

export const subServices = ambassade.table("sub_services", {
  id: text("id").primaryKey(),
  serviceId: text("service_id").notNull(),
  name: text("name").notNull(),
  code: text("code"),
  description: text("description"),
  active: boolean("active"),
});
