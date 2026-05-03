"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessions = exports.otps = exports.userRoles = exports.roles = exports.workerProfiles = exports.studentScholarships = exports.studentProfiles = exports.userProfiles = exports.users = exports.identity = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.identity = (0, pg_core_1.pgSchema)("identity");
exports.users = exports.identity.table("users", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    phone: (0, pg_core_1.varchar)("phone", { length: 20 }),
    emailVerified: (0, pg_core_1.boolean)("email_verified").default(false),
    phoneVerified: (0, pg_core_1.boolean)("phone_verified").default(false),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).default("UNVERIFIED"),
    passwordHash: (0, pg_core_1.varchar)("password_hash", { length: 255 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.userProfiles = exports.identity.table("user_profiles", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    inue: (0, pg_core_1.varchar)("inue", { length: 50 }),
    userType: (0, pg_core_1.varchar)("user_type", { length: 20 }).notNull(),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 100 }).notNull(),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 100 }).notNull(),
    bio: (0, pg_core_1.text)("bio"),
    birthDate: (0, pg_core_1.timestamp)("birth_date"),
    address: (0, pg_core_1.text)("address"),
    city: (0, pg_core_1.varchar)("city", { length: 100 }),
    country: (0, pg_core_1.varchar)("country", { length: 100 }),
    zipCode: (0, pg_core_1.varchar)("zip_code", { length: 10 }),
    gender: (0, pg_core_1.varchar)("gender", { length: 10 }),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.studentProfiles = exports.identity.table("student_profiles", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    university: (0, pg_core_1.varchar)("university", { length: 255 }),
    faculty: (0, pg_core_1.varchar)("faculty", { length: 255 }),
    studyLevel: (0, pg_core_1.varchar)("study_level", { length: 100 }),
});
exports.studentScholarships = exports.identity.table("student_scholarships", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    studentProfileId: (0, pg_core_1.uuid)("student_profile_id")
        .notNull()
        .references(() => exports.studentProfiles.id, { onDelete: "cascade" }),
    isRecipient: (0, pg_core_1.boolean)("is_recipient").default(false),
    decisionNumber: (0, pg_core_1.varchar)("decision_number", { length: 100 }),
    promotion: (0, pg_core_1.varchar)("promotion", { length: 100 }),
});
exports.workerProfiles = exports.identity.table("worker_profiles", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    employer: (0, pg_core_1.varchar)("employer", { length: 255 }),
    profession: (0, pg_core_1.varchar)("profession", { length: 255 }),
    contractType: (0, pg_core_1.varchar)("contract_type", { length: 100 }),
});
exports.roles = exports.identity.table("roles", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    name: (0, pg_core_1.varchar)("name", { length: 50 }).notNull().unique(),
    description: (0, pg_core_1.text)("description"),
});
exports.userRoles = exports.identity.table("user_roles", {
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    roleId: (0, pg_core_1.uuid)("role_id")
        .notNull()
        .references(() => exports.roles.id, { onDelete: "cascade" }),
});
exports.otps = exports.identity.table("otps", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.varchar)("email_phone", { length: 255 }).notNull(),
    codeHash: (0, pg_core_1.varchar)("code_hash", { length: 255 }).notNull(),
    channel: (0, pg_core_1.varchar)("channel", { length: 10 }).notNull(),
    purpose: (0, pg_core_1.varchar)("purpose", { length: 20 }).notNull(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at").notNull(),
    consumedAt: (0, pg_core_1.timestamp)("consumed_at"),
});
exports.sessions = exports.identity.table("sessions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    refreshTokenHash: (0, pg_core_1.varchar)("refresh_token_hash", { length: 255 }).notNull(),
    ip: (0, pg_core_1.varchar)("ip", { length: 100 }),
    userAgent: (0, pg_core_1.text)("user_agent"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    revokedAt: (0, pg_core_1.timestamp)("revoked_at"),
});
//# sourceMappingURL=schema.identity.js.map