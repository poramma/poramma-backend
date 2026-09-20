"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.subServices = exports.services = exports.agentExceptions = exports.agentAvailabilities = exports.agentServiceAssignments = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const ambassade = (0, pg_core_1.pgSchema)("ambassade");
exports.agentServiceAssignments = ambassade.table("agent_service_assignments", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    agentId: (0, pg_core_1.uuid)("agent_id").notNull(),
    subServiceId: (0, pg_core_1.text)("sub_service_id").notNull(),
    assignedBy: (0, pg_core_1.uuid)("assigned_by"),
    assignedAt: (0, pg_core_1.timestamp)("assigned_at"),
    validFrom: (0, pg_core_1.date)("valid_from"),
    validUntil: (0, pg_core_1.date)("valid_until"),
    isPrimary: (0, pg_core_1.boolean)("is_primary"),
    maxDailyAppointments: (0, pg_core_1.integer)("max_daily_appointments"),
    notes: (0, pg_core_1.text)("notes"),
    active: (0, pg_core_1.boolean)("active"),
});
exports.agentAvailabilities = ambassade.table("agent_availabilities", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    agentId: (0, pg_core_1.uuid)("agent_id").notNull(),
    dayOfWeek: (0, pg_core_1.integer)("day_of_week").notNull(),
    startTime: (0, pg_core_1.time)("start_time"),
    endTime: (0, pg_core_1.time)("end_time"),
    isAvailable: (0, pg_core_1.boolean)("is_available"),
    validFrom: (0, pg_core_1.date)("valid_from"),
    validUntil: (0, pg_core_1.date)("valid_until"),
});
exports.agentExceptions = ambassade.table("agent_exceptions", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    agentId: (0, pg_core_1.uuid)("agent_id").notNull(),
    date: (0, pg_core_1.date)("date").notNull(),
    type: (0, pg_core_1.text)("type").notNull(),
    reason: (0, pg_core_1.text)("reason").notNull(),
    isFullDay: (0, pg_core_1.boolean)("is_full_day"),
    startTime: (0, pg_core_1.time)("start_time"),
    endTime: (0, pg_core_1.time)("end_time"),
    createdBy: (0, pg_core_1.uuid)("created_by"),
    createdAt: (0, pg_core_1.timestamp)("created_at"),
});
exports.services = ambassade.table("services", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
});
exports.subServices = ambassade.table("sub_services", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    serviceId: (0, pg_core_1.text)("service_id").notNull(),
    name: (0, pg_core_1.text)("name").notNull(),
    code: (0, pg_core_1.text)("code"),
    description: (0, pg_core_1.text)("description"),
    active: (0, pg_core_1.boolean)("active"),
});
//# sourceMappingURL=schema.ambassade-readonly.js.map