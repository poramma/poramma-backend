"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirements = exports.serviceExceptions = exports.serviceSchedules = exports.subServices = exports.services = exports.ambassade = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.ambassade = (0, pg_core_1.pgSchema)("ambassade");
exports.services = exports.ambassade.table("services", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    code: (0, pg_core_1.varchar)("code", { length: 100 }).notNull().unique(),
    description: (0, pg_core_1.text)("description"),
    icon: (0, pg_core_1.varchar)("icon", { length: 100 }),
    order: (0, pg_core_1.integer)("order").default(0),
    active: (0, pg_core_1.boolean)("active").default(true),
    requiresAppointment: (0, pg_core_1.boolean)("requires_appointment").default(false),
    isCultural: (0, pg_core_1.boolean)("is_cultural").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.subServices = exports.ambassade.table("sub_services", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    serviceId: (0, pg_core_1.text)("service_id")
        .notNull()
        .references(() => exports.services.id, { onDelete: "cascade" }),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    code: (0, pg_core_1.varchar)("code", { length: 100 }).notNull().unique(),
    description: (0, pg_core_1.text)("description"),
    active: (0, pg_core_1.boolean)("active").default(true),
    basePrice: (0, pg_core_1.decimal)("base_price", { precision: 10, scale: 2 }),
    currency: (0, pg_core_1.varchar)("currency", { length: 10 }).default("MAD"),
    slaDays: (0, pg_core_1.integer)("sla_days").notNull(),
    allowCustomRequest: (0, pg_core_1.boolean)("allow_custom_request").default(false),
    requiresInPerson: (0, pg_core_1.boolean)("requires_in_person").default(true),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.serviceSchedules = exports.ambassade.table("service_schedules", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    subServiceId: (0, pg_core_1.text)("sub_service_id")
        .notNull()
        .references(() => exports.subServices.id, { onDelete: "cascade" }),
    dayOfWeek: (0, pg_core_1.integer)("day_of_week").notNull(),
    startTime: (0, pg_core_1.time)("start_time").notNull(),
    endTime: (0, pg_core_1.time)("end_time").notNull(),
    slotDurationMinutes: (0, pg_core_1.integer)("slot_duration_minutes").notNull().default(30),
    maxConcurrentSlots: (0, pg_core_1.integer)("max_concurrent_slots").notNull().default(1),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
    validFrom: (0, pg_core_1.date)("valid_from").notNull(),
    validUntil: (0, pg_core_1.date)("valid_until"),
});
exports.serviceExceptions = exports.ambassade.table("service_exceptions", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    subServiceId: (0, pg_core_1.text)("sub_service_id")
        .notNull()
        .references(() => exports.subServices.id, { onDelete: "cascade" }),
    date: (0, pg_core_1.date)("date").notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 20 }).notNull(),
    startTime: (0, pg_core_1.time)("start_time"),
    endTime: (0, pg_core_1.time)("end_time"),
    reason: (0, pg_core_1.text)("reason").notNull(),
    createdBy: (0, pg_core_1.text)("created_by").notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.requirements = exports.ambassade.table("requirements", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    subServiceId: (0, pg_core_1.text)("sub_service_id")
        .notNull()
        .references(() => exports.subServices.id, { onDelete: "cascade" }),
    type: (0, pg_core_1.varchar)("type", { length: 20 }).notNull(),
    label: (0, pg_core_1.varchar)("label", { length: 255 }).notNull(),
    key: (0, pg_core_1.varchar)("key", { length: 100 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    required: (0, pg_core_1.boolean)("required").default(true),
    order: (0, pg_core_1.integer)("order").default(0),
    schema: (0, pg_core_1.jsonb)("schema"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
//# sourceMappingURL=services.js.map