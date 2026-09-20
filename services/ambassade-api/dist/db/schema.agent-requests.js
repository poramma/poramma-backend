"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentRequests = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const schema_ambassade_1 = require("./schema.ambassade");
exports.agentRequests = schema_ambassade_1.ambassade.table("agent_requests", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    requesterUserId: (0, pg_core_1.uuid)("requester_user_id").notNull(),
    kind: (0, pg_core_1.varchar)("kind", { length: 20 }).notNull(),
    category: (0, pg_core_1.varchar)("category", { length: 30 }).notNull(),
    subject: (0, pg_core_1.varchar)("subject", { length: 200 }).notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    targetSubServiceId: (0, pg_core_1.text)("target_sub_service_id"),
    targetPermission: (0, pg_core_1.varchar)("target_permission", { length: 100 }),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("PENDING"),
    adminResponse: (0, pg_core_1.text)("admin_response"),
    handledBy: (0, pg_core_1.uuid)("handled_by"),
    handledAt: (0, pg_core_1.timestamp)("handled_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
}, (t) => [(0, pg_core_1.index)("agent_requests_status_idx").on(t.status, t.createdAt), (0, pg_core_1.index)("agent_requests_requester_idx").on(t.requesterUserId)]);
//# sourceMappingURL=schema.agent-requests.js.map