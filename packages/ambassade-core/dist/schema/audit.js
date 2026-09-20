"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogs = exports.audit = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.audit = (0, pg_core_1.pgSchema)("audit");
exports.auditLogs = exports.audit.table("audit_logs", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    at: (0, pg_core_1.timestamp)("at").defaultNow().notNull(),
    actorUserId: (0, pg_core_1.uuid)("actor_user_id"),
    actorRole: (0, pg_core_1.varchar)("actor_role", { length: 50 }),
    action: (0, pg_core_1.varchar)("action", { length: 50 }).notNull(),
    entityType: (0, pg_core_1.varchar)("entity_type", { length: 50 }).notNull(),
    entityId: (0, pg_core_1.text)("entity_id").notNull(),
    entitySnapshot: (0, pg_core_1.jsonb)("entity_snapshot"),
    result: (0, pg_core_1.varchar)("result", { length: 20 }).notNull().default("SUCCESS"),
    details: (0, pg_core_1.jsonb)("details"),
    ip: (0, pg_core_1.varchar)("ip", { length: 64 }),
    ua: (0, pg_core_1.text)("ua"),
    sessionId: (0, pg_core_1.text)("session_id"),
    severity: (0, pg_core_1.varchar)("severity", { length: 20 }).notNull().default("INFO"),
});
//# sourceMappingURL=audit.js.map