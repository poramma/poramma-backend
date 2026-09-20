import { text, varchar, boolean, integer, timestamp, time, date, jsonb, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { ambassade, subServices } from "./services";
import { demandes } from "./demandes";

// agentId/userId/createdBy/printedBy point at identity.agents/identity.users
// — same physical database, different schema. No cross-schema FK declared
// here for the same reason as schema/demandes.ts (see its header comment).
// Tables déplacées d'ambassade-api vers ce package (partagées avec
// communaute-api) ; les migrations restent gérées par ambassade-api.

// --- AGENT SERVICE ASSIGNMENTS (quel agent sert quel sous-service) ---
// Mission prompt SVC-04: gestion réservée à l'ADMIN (service:admin).
export const agentServiceAssignments = ambassade.table("agent_service_assignments", {
  id: text("id").primaryKey(),
  agentId: uuid("agent_id").notNull(),
  subServiceId: text("sub_service_id")
    .notNull()
    .references(() => subServices.id, { onDelete: "cascade" }),
  assignedBy: uuid("assigned_by"),
  assignedAt: timestamp("assigned_at").defaultNow(),
  validFrom: date("valid_from"),
  validUntil: date("valid_until"),
  isPrimary: boolean("is_primary").default(false),
  maxDailyAppointments: integer("max_daily_appointments"),
  notes: text("notes"),
  active: boolean("active").default(true),
});

// --- AGENT AVAILABILITIES (disponibilité hebdomadaire récurrente) ---
export const agentAvailabilities = ambassade.table("agent_availabilities", {
  id: text("id").primaryKey(),
  agentId: uuid("agent_id").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 1=Lundi .. 7=Dimanche
  startTime: time("start_time"),
  endTime: time("end_time"),
  isAvailable: boolean("is_available").default(true),
  validFrom: date("valid_from"),
  validUntil: date("valid_until"),
});

// --- AGENT EXCEPTIONS (absence, formation, mission ponctuelle) ---
export const agentExceptions = ambassade.table("agent_exceptions", {
  id: text("id").primaryKey(),
  agentId: uuid("agent_id").notNull(),
  date: date("date").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // ABSENCE | TRAINING | HOLIDAY | MISSION | OTHER
  reason: text("reason").notNull(),
  isFullDay: boolean("is_full_day").default(true),
  startTime: time("start_time"),
  endTime: time("end_time"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- RENDEZ-VOUS ---
// slotId est l'id virtuel du créneau (dérivé subServiceId+agentId+date+heure,
// jamais matérialisé en table — voir services/rendezvous.ts) : null pour une
// urgence, qui n'occupe pas un créneau planifié.
//
// Un créneau ne peut être réservé qu'une fois tant que le rendez-vous est
// actif : index unique partiel (les statuts annulés / absent libèrent le
// créneau). C'est ce qui rend la réservation sûre en cas de concurrence.
export const rendezVous = ambassade.table(
  "rendez_vous",
  {
    id: text("id").primaryKey(),
    demandeId: text("demande_id").references(() => demandes.id),
    // null = personne SANS compte reçue à l'accueil en urgence (identité minimale dans `visitor`).
    userId: uuid("user_id"),
    /** Identité minimale d'un visiteur sans compte : { lastName, firstName, phone, city }. */
    visitor: jsonb("visitor").$type<{ lastName: string; firstName: string; phone: string; city: string } | null>(),
    subServiceId: text("sub_service_id")
      .notNull()
      .references(() => subServices.id),
    agentId: uuid("agent_id").notNull(),
    slotId: text("slot_id"),
    date: date("date").notNull(), // date du RDV (créneau planifié, ou jour de l'urgence) — distinct de createdAt
    ticketId: varchar("ticket_id", { length: 50 }).notNull().unique(),
    type: varchar("type", { length: 20 }).notNull().default("STANDARD"),
    status: varchar("status", { length: 30 }).notNull().default("PENDING"),
    motif: text("motif"),
    isUrgent: boolean("is_urgent").default(false),
    urgenceJustification: text("urgence_justification"),
    createdBy: uuid("created_by").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    remindedAt: timestamp("reminded_at"),
    checkedInAt: timestamp("checked_in_at"),
    completedAt: timestamp("completed_at"),
  },
  (t) => [
    uniqueIndex("rendez_vous_active_slot_uq")
      .on(t.slotId)
      .where(sql`${t.slotId} is not null and ${t.status} not in ('CANCELLED_BY_USER','CANCELLED_BY_AGENT','NO_SHOW')`),
  ]
);

// --- RENDEZ-VOUS NOTES (espace d'échange demandeur ↔ agents, même modèle
// que demande_comments : isInternal=false = visible du demandeur) ---
export const rendezVousNotes = ambassade.table("rendez_vous_notes", {
  id: text("id").primaryKey(),
  rendezVousId: text("rendez_vous_id")
    .notNull()
    .references(() => rendezVous.id, { onDelete: "cascade" }),
  authorId: uuid("author_id").notNull(),
  authorName: varchar("author_name", { length: 255 }),
  authorType: varchar("author_type", { length: 10 }).notNull().default("AGENT"),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- DAILY SCHEDULE PRINTS (planning imprimé pour le poste de garde) ---
export const dailySchedulePrints = ambassade.table("daily_schedule_prints", {
  id: text("id").primaryKey(),
  date: date("date").notNull(),
  agentId: uuid("agent_id"), // null = tous les agents
  subServiceId: text("sub_service_id"), // null = tous les services
  printedBy: uuid("printed_by").notNull(),
  printedAt: timestamp("printed_at").defaultNow(),
  format: varchar("format", { length: 10 }).notNull().default("PDF"),
  content: jsonb("content").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("GENERATED"),
});
