"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessions = exports.otps = exports.agentActivities = exports.agents = exports.userRoles = exports.rolePermissions = exports.permissions = exports.roles = exports.workerProfiles = exports.studentScholarships = exports.studentProfiles = exports.userProfiles = exports.users = exports.identity = void 0;
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
    userType: (0, pg_core_1.varchar)("user_type", { length: 20 }).default("other"),
    firstName: (0, pg_core_1.varchar)("first_name", { length: 255 }),
    lastName: (0, pg_core_1.varchar)("last_name", { length: 255 }),
    bio: (0, pg_core_1.text)("bio").default(""),
    birthDate: (0, pg_core_1.varchar)("birth_date", { length: 20 }),
    nationality: (0, pg_core_1.varchar)("nationality", { length: 100 }),
    address: (0, pg_core_1.varchar)("address", { length: 255 }),
    city: (0, pg_core_1.varchar)("city", { length: 255 }),
    country: (0, pg_core_1.varchar)("country", { length: 255 }),
    zipCode: (0, pg_core_1.varchar)("zip_code", { length: 20 }),
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
    level: (0, pg_core_1.integer)("level").notNull(),
    isSystem: (0, pg_core_1.boolean)("is_system").default(true),
});
exports.permissions = exports.identity.table("permissions", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    code: (0, pg_core_1.varchar)("code", { length: 100 }).notNull().unique(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    description: (0, pg_core_1.text)("description"),
    resource: (0, pg_core_1.varchar)("resource", { length: 50 }).notNull(),
    action: (0, pg_core_1.varchar)("action", { length: 50 }).notNull(),
    category: (0, pg_core_1.varchar)("category", { length: 100 }),
    minRoleLevel: (0, pg_core_1.integer)("min_role_level").notNull(),
});
exports.rolePermissions = exports.identity.table("role_permissions", {
    roleId: (0, pg_core_1.uuid)("role_id")
        .notNull()
        .references(() => exports.roles.id, { onDelete: "cascade" }),
    permissionId: (0, pg_core_1.uuid)("permission_id")
        .notNull()
        .references(() => exports.permissions.id, { onDelete: "cascade" }),
}, (table) => [(0, pg_core_1.primaryKey)({ columns: [table.roleId, table.permissionId] })]);
exports.userRoles = exports.identity.table("user_roles", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    roleId: (0, pg_core_1.uuid)("role_id")
        .notNull()
        .references(() => exports.roles.id, { onDelete: "cascade" }),
    assignedBy: (0, pg_core_1.uuid)("assigned_by"),
    assignedAt: (0, pg_core_1.timestamp)("assigned_at").defaultNow(),
    expiresAt: (0, pg_core_1.timestamp)("expires_at"),
    isActive: (0, pg_core_1.boolean)("is_active").default(true),
});
exports.agents = exports.identity.table("agents", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id")
        .notNull()
        .unique()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    matricule: (0, pg_core_1.varchar)("matricule", { length: 50 }).notNull().unique(),
    roleTitle: (0, pg_core_1.varchar)("role_title", { length: 255 }),
    department: (0, pg_core_1.varchar)("department", { length: 30 }).notNull(),
    officeNumber: (0, pg_core_1.varchar)("office_number", { length: 50 }),
    signatureUrl: (0, pg_core_1.text)("signature_url"),
    signatureStorageKey: (0, pg_core_1.text)("signature_storage_key"),
    active: (0, pg_core_1.boolean)("active").default(true),
    hiredAt: (0, pg_core_1.timestamp)("hired_at").notNull(),
    preferences: (0, pg_core_1.jsonb)("preferences").default({}),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.agentActivities = exports.identity.table("agent_activities", {
    id: (0, pg_core_1.uuid)("id").defaultRandom().primaryKey(),
    agentUserId: (0, pg_core_1.uuid)("agent_user_id")
        .notNull()
        .references(() => exports.users.id, { onDelete: "cascade" }),
    action: (0, pg_core_1.varchar)("action", { length: 50 }).notNull(),
    targetType: (0, pg_core_1.varchar)("target_type", { length: 30 }).notNull(),
    targetLabel: (0, pg_core_1.varchar)("target_label", { length: 255 }).notNull(),
    targetId: (0, pg_core_1.varchar)("target_id", { length: 100 }).notNull(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
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
    rememberMe: (0, pg_core_1.boolean)("remember_me").notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    revokedAt: (0, pg_core_1.timestamp)("revoked_at"),
});
//# sourceMappingURL=schema.identity.js.map