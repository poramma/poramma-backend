"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identityUserRoles = exports.identityRoles = exports.identityAgents = exports.identityWorkerProfiles = exports.identityStudentScholarships = exports.identityStudentProfiles = exports.identityUserProfiles = exports.identityUsers = exports.identity = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.identity = (0, pg_core_1.pgSchema)("identity");
exports.identityUsers = exports.identity.table("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull(),
    phone: (0, pg_core_1.varchar)("phone", { length: 20 }),
    status: (0, pg_core_1.varchar)("status", { length: 20 }),
    createdAt: (0, pg_core_1.timestamp)("created_at"),
});
exports.identityUserProfiles = exports.identity.table("user_profiles", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    inue: (0, pg_core_1.varchar)("inue", { length: 50 }),
    userType: (0, pg_core_1.varchar)("user_type", { length: 20 }),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }),
    nationality: (0, pg_core_1.varchar)("nationality", { length: 100 }),
    address: (0, pg_core_1.varchar)("address", { length: 255 }),
    city: (0, pg_core_1.varchar)("city", { length: 255 }),
    country: (0, pg_core_1.varchar)("country", { length: 255 }),
});
exports.identityStudentProfiles = exports.identity.table("student_profiles", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    university: (0, pg_core_1.varchar)("university", { length: 255 }),
    faculty: (0, pg_core_1.varchar)("faculty", { length: 255 }),
    studyLevel: (0, pg_core_1.varchar)("study_level", { length: 100 }),
});
exports.identityStudentScholarships = exports.identity.table("student_scholarships", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    studentProfileId: (0, pg_core_1.uuid)("student_profile_id").notNull(),
    isRecipient: (0, pg_core_1.boolean)("is_recipient"),
    decisionNumber: (0, pg_core_1.varchar)("decision_number", { length: 100 }),
    promotion: (0, pg_core_1.varchar)("promotion", { length: 100 }),
});
exports.identityWorkerProfiles = exports.identity.table("worker_profiles", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    employer: (0, pg_core_1.varchar)("employer", { length: 255 }),
    profession: (0, pg_core_1.varchar)("profession", { length: 255 }),
    contractType: (0, pg_core_1.varchar)("contract_type", { length: 100 }),
});
exports.identityAgents = exports.identity.table("agents", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    roleTitle: (0, pg_core_1.varchar)("role_title", { length: 255 }),
    active: (0, pg_core_1.boolean)("active"),
});
exports.identityRoles = exports.identity.table("roles", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 50 }).notNull(),
});
exports.identityUserRoles = exports.identity.table("user_roles", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    roleId: (0, pg_core_1.uuid)("role_id").notNull(),
    isActive: (0, pg_core_1.boolean)("is_active"),
});
//# sourceMappingURL=identity.js.map