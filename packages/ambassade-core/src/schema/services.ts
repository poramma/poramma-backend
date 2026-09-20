import { pgSchema, text, varchar, boolean, integer, decimal, timestamp, time, date, jsonb } from "drizzle-orm/pg-core";

// Schéma Postgres partagé "ambassade" — propriété historique d'ambassade-api
// (qui gère les migrations), lu et écrit ici par communaute-api via le même
// connection pool applicatif (pas de HTTP inter-service, voir la décision
// architecture "miroir cross-schema").
export const ambassade = pgSchema("ambassade");

// IDs are TEXT, not UUID: the frontend's seed data (config/services-consulaires.ts)
// uses readable string ids ("svc-001", "sub-001", ...) — keeping the same type
// lets the seed reuse those ids exactly. New rows created via the API generate
// a crypto.randomUUID() string in application code.

// --- SERVICES (catalogue, ex-catégories) ---
export const services = ambassade.table("services", {
  id: text("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  icon: varchar("icon", { length: 100 }),
  order: integer("order").default(0),
  active: boolean("active").default(true),
  requiresAppointment: boolean("requires_appointment").default(false),
  // Service de l'espace culturel : servi par le Conseiller Culturel, à visage découvert
  // (contrairement aux services consulaires où l'agent reste anonyme pour l'usager).
  isCultural: boolean("is_cultural").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- SUB SERVICES (prestations concrètes) ---
export const subServices = ambassade.table("sub_services", {
  id: text("id").primaryKey(),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  active: boolean("active").default(true),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 10 }).default("MAD"),
  slaDays: integer("sla_days").notNull(),
  allowCustomRequest: boolean("allow_custom_request").default(false),
  requiresInPerson: boolean("requires_in_person").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- SERVICE SCHEDULES (horaires d'ouverture) ---
export const serviceSchedules = ambassade.table("service_schedules", {
  id: text("id").primaryKey(),
  subServiceId: text("sub_service_id")
    .notNull()
    .references(() => subServices.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Lundi .. 7=Dimanche
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  slotDurationMinutes: integer("slot_duration_minutes").notNull().default(30),
  maxConcurrentSlots: integer("max_concurrent_slots").notNull().default(1),
  isActive: boolean("is_active").default(true),
  validFrom: date("valid_from").notNull(),
  validUntil: date("valid_until"),
});

// --- SERVICE EXCEPTIONS (fermetures, horaires spéciaux) ---
export const serviceExceptions = ambassade.table("service_exceptions", {
  id: text("id").primaryKey(),
  subServiceId: text("sub_service_id")
    .notNull()
    .references(() => subServices.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // CLOSED | SPECIAL_HOURS | EXTRA_CAPACITY
  startTime: time("start_time"),
  endTime: time("end_time"),
  reason: text("reason").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- REQUIREMENTS (prérequis d'une demande) ---
export const requirements = ambassade.table("requirements", {
  id: text("id").primaryKey(),
  subServiceId: text("sub_service_id")
    .notNull()
    .references(() => subServices.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(), // DOCUMENT | FIELD | FEE | PHOTO | SIGNATURE
  label: varchar("label", { length: 255 }).notNull(),
  key: varchar("key", { length: 100 }).notNull(),
  description: text("description"),
  required: boolean("required").default(true),
  order: integer("order").default(0),
  schema: jsonb("schema"),
  createdAt: timestamp("created_at").defaultNow(),
});
