"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkInRequests = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_ambassade_1 = require("./schema.ambassade");
const schema_demandes_1 = require("./schema.demandes");
const schema_rendezvous_1 = require("./schema.rendezvous");
exports.walkInRequests = schema_ambassade_1.ambassade.table("walk_in_requests", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    reference: (0, pg_core_1.varchar)("reference", { length: 30 }).notNull().unique(),
    visitorName: (0, pg_core_1.varchar)("visitor_name", { length: 150 }).notNull(),
    visitorPhone: (0, pg_core_1.varchar)("visitor_phone", { length: 30 }),
    userId: (0, pg_core_1.uuid)("user_id"),
    subServiceId: (0, pg_core_1.text)("sub_service_id").references(() => schema_ambassade_1.subServices.id),
    category: (0, pg_core_1.varchar)("category", { length: 20 }).notNull().default("INFORMATION"),
    subject: (0, pg_core_1.text)("subject").notNull(),
    notes: (0, pg_core_1.text)("notes"),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("WAITING"),
    priority: (0, pg_core_1.varchar)("priority", { length: 10 }).notNull().default("NORMAL"),
    assignedAgentId: (0, pg_core_1.uuid)("assigned_agent_id"),
    demandeId: (0, pg_core_1.text)("demande_id").references(() => schema_demandes_1.demandes.id),
    rendezVousId: (0, pg_core_1.text)("rendez_vous_id").references(() => schema_rendezvous_1.rendezVous.id),
    outcome: (0, pg_core_1.text)("outcome"),
    redirectedSubServiceId: (0, pg_core_1.text)("redirected_sub_service_id").references(() => schema_ambassade_1.subServices.id),
    registeredBy: (0, pg_core_1.uuid)("registered_by").notNull(),
    startedAt: (0, pg_core_1.timestamp)("started_at"),
    closedAt: (0, pg_core_1.timestamp)("closed_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (t) => [(0, pg_core_1.index)("walk_in_requests_created_idx").on(t.createdAt), (0, pg_core_1.index)("walk_in_requests_status_idx").on(t.status)]);
//# sourceMappingURL=schema.walkin.js.map