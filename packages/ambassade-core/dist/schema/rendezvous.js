"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailySchedulePrints = exports.rendezVousNotes = exports.rendezVous = exports.agentExceptions = exports.agentAvailabilities = exports.agentServiceAssignments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const services_1 = require("./services");
const demandes_1 = require("./demandes");
exports.agentServiceAssignments = services_1.ambassade.table("agent_service_assignments", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    agentId: (0, pg_core_1.uuid)("agent_id").notNull(),
    subServiceId: (0, pg_core_1.text)("sub_service_id")
        .notNull()
        .references(() => services_1.subServices.id, { onDelete: "cascade" }),
    assignedBy: (0, pg_core_1.uuid)("assigned_by"),
    assignedAt: (0, pg_core_1.timestamp)("assigned_at").defaultNow(),
    validFrom: (0, pg_core_1.date)("valid_from"),
    validUntil: (0, pg_core_1.date)("valid_until"),
    isPrimary: (0, pg_core_1.boolean)("is_primary").default(false),
    maxDailyAppointments: (0, pg_core_1.integer)("max_daily_appointments"),
    notes: (0, pg_core_1.text)("notes"),
    active: (0, pg_core_1.boolean)("active").default(true),
});
exports.agentAvailabilities = services_1.ambassade.table("agent_availabilities", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    agentId: (0, pg_core_1.uuid)("agent_id").notNull(),
    dayOfWeek: (0, pg_core_1.integer)("day_of_week").notNull(),
    startTime: (0, pg_core_1.time)("start_time"),
    endTime: (0, pg_core_1.time)("end_time"),
    isAvailable: (0, pg_core_1.boolean)("is_available").default(true),
    validFrom: (0, pg_core_1.date)("valid_from"),
    validUntil: (0, pg_core_1.date)("valid_until"),
});
exports.agentExceptions = services_1.ambassade.table("agent_exceptions", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    agentId: (0, pg_core_1.uuid)("agent_id").notNull(),
    date: (0, pg_core_1.date)("date").notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 20 }).notNull(),
    reason: (0, pg_core_1.text)("reason").notNull(),
    isFullDay: (0, pg_core_1.boolean)("is_full_day").default(true),
    startTime: (0, pg_core_1.time)("start_time"),
    endTime: (0, pg_core_1.time)("end_time"),
    createdBy: (0, pg_core_1.uuid)("created_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.rendezVous = services_1.ambassade.table("rendez_vous", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    demandeId: (0, pg_core_1.text)("demande_id").references(() => demandes_1.demandes.id),
    userId: (0, pg_core_1.uuid)("user_id"),
    visitor: (0, pg_core_1.jsonb)("visitor").$type(),
    subServiceId: (0, pg_core_1.text)("sub_service_id")
        .notNull()
        .references(() => services_1.subServices.id),
    agentId: (0, pg_core_1.uuid)("agent_id").notNull(),
    slotId: (0, pg_core_1.text)("slot_id"),
    date: (0, pg_core_1.date)("date").notNull(),
    ticketId: (0, pg_core_1.varchar)("ticket_id", { length: 50 }).notNull().unique(),
    type: (0, pg_core_1.varchar)("type", { length: 20 }).notNull().default("STANDARD"),
    status: (0, pg_core_1.varchar)("status", { length: 30 }).notNull().default("PENDING"),
    motif: (0, pg_core_1.text)("motif"),
    isUrgent: (0, pg_core_1.boolean)("is_urgent").default(false),
    urgenceJustification: (0, pg_core_1.text)("urgence_justification"),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
    remindedAt: (0, pg_core_1.timestamp)("reminded_at"),
    checkedInAt: (0, pg_core_1.timestamp)("checked_in_at"),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
}, (t) => [
    (0, pg_core_1.uniqueIndex)("rendez_vous_active_slot_uq")
        .on(t.slotId)
        .where((0, drizzle_orm_1.sql) `${t.slotId} is not null and ${t.status} not in ('CANCELLED_BY_USER','CANCELLED_BY_AGENT','NO_SHOW')`),
]);
exports.rendezVousNotes = services_1.ambassade.table("rendez_vous_notes", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    rendezVousId: (0, pg_core_1.text)("rendez_vous_id")
        .notNull()
        .references(() => exports.rendezVous.id, { onDelete: "cascade" }),
    authorId: (0, pg_core_1.uuid)("author_id").notNull(),
    authorName: (0, pg_core_1.varchar)("author_name", { length: 255 }),
    authorType: (0, pg_core_1.varchar)("author_type", { length: 10 }).notNull().default("AGENT"),
    content: (0, pg_core_1.text)("content").notNull(),
    isInternal: (0, pg_core_1.boolean)("is_internal").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.dailySchedulePrints = services_1.ambassade.table("daily_schedule_prints", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    date: (0, pg_core_1.date)("date").notNull(),
    agentId: (0, pg_core_1.uuid)("agent_id"),
    subServiceId: (0, pg_core_1.text)("sub_service_id"),
    printedBy: (0, pg_core_1.uuid)("printed_by").notNull(),
    printedAt: (0, pg_core_1.timestamp)("printed_at").defaultNow(),
    format: (0, pg_core_1.varchar)("format", { length: 10 }).notNull().default("PDF"),
    content: (0, pg_core_1.jsonb)("content").notNull(),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("GENERATED"),
});
//# sourceMappingURL=rendezvous.js.map