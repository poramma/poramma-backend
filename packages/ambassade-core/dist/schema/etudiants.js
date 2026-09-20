"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inueSequences = exports.etudiants = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const services_1 = require("./services");
exports.etudiants = services_1.ambassade.table("etudiants", {
    id: (0, pg_core_1.text)("id").primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull().unique(),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("PENDING"),
    inue: (0, pg_core_1.varchar)("inue", { length: 20 }).unique(),
    inueAssignedAt: (0, pg_core_1.timestamp)("inue_assigned_at"),
    inueAssignedBy: (0, pg_core_1.uuid)("inue_assigned_by"),
    submittedAt: (0, pg_core_1.timestamp)("submitted_at"),
    reviewNote: (0, pg_core_1.text)("review_note"),
    reviewedBy: (0, pg_core_1.uuid)("reviewed_by"),
    reviewedAt: (0, pg_core_1.timestamp)("reviewed_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.inueSequences = services_1.ambassade.table("inue_sequences", {
    year: (0, pg_core_1.integer)("year").primaryKey(),
    lastNumber: (0, pg_core_1.integer)("last_number").notNull().default(0),
});
//# sourceMappingURL=etudiants.js.map