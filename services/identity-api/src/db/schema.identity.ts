import { pgSchema, uuid, varchar, boolean, timestamp, text, integer, primaryKey, jsonb } from "drizzle-orm/pg-core";

// Définir le schéma
export const identity = pgSchema("identity");

// --- USERS ---
export const users = identity.table("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  emailVerified: boolean("email_verified").default(false),
  phoneVerified: boolean("phone_verified").default(false),
  status: varchar("status", { length: 20 }).default("UNVERIFIED"), // enum logique
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- USER PROFILE ---
export const userProfiles = identity.table("user_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  inue: varchar("inue", { length: 50 }),
  userType: varchar("user_type", { length: 20 }).default("other"), // par défaut
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  bio: text("bio").default(""),
  birthDate: varchar("birth_date", { length: 20 }), // ou `date("birth_date")`
  nationality: varchar("nationality", { length: 100 }),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 255 }),
  country: varchar("country", { length: 255 }),
  zipCode: varchar("zip_code", { length: 20 }),
  gender: varchar("gender", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


// --- STUDENT PROFILE ---
export const studentProfiles = identity.table("student_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  university: varchar("university", { length: 255 }),
  faculty: varchar("faculty", { length: 255 }),
  studyLevel: varchar("study_level", { length: 100 }),
});

// --- STUDENT SCHOLARSHIP ---
export const studentScholarships = identity.table("student_scholarships", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentProfileId: uuid("student_profile_id")
    .notNull()
    .references(() => studentProfiles.id, { onDelete: "cascade" }),
  isRecipient: boolean("is_recipient").default(false),
  decisionNumber: varchar("decision_number", { length: 100 }),
  promotion: varchar("promotion", { length: 100 }),
});

// --- WORKER PROFILE ---
export const workerProfiles = identity.table("worker_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  employer: varchar("employer", { length: 255 }),
  profession: varchar("profession", { length: 255 }),
  contractType: varchar("contract_type", { length: 100 }),
});

// --- ROLES ---
// Hierarchy: 1 = ADMIN (carte blanche), 6 = AUDITOR (read-only).
// A role of level N inherits permissions from levels N+1..6, but never from
// a lower level number — see [[rbac_hierarchy_decision]] in project memory.
export const roles = identity.table("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  level: integer("level").notNull(),
  isSystem: boolean("is_system").default(true),
});

// --- PERMISSIONS (catalog) ---
// code format: "{resource}:{action}", matches frontend PermissionCode exactly.
export const permissions = identity.table("permissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  resource: varchar("resource", { length: 50 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(),
  category: varchar("category", { length: 100 }),
  minRoleLevel: integer("min_role_level").notNull(),
});

// --- ROLE PERMISSIONS (pivot) ---
export const rolePermissions = identity.table(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })]
);

// --- USER ROLES (pivot) ---
export const userRoles = identity.table("user_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  assignedBy: uuid("assigned_by"),
  assignedAt: timestamp("assigned_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
});

// --- AGENTS (staff extension of users) ---
// assignments/availabilities/exceptions (Agent interface's optional fields)
// live in ambassade-api's schema (they reference sub_service_id, which
// doesn't exist until Phase 4/6) — not duplicated here.
export const agents = identity.table("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  matricule: varchar("matricule", { length: 50 }).notNull().unique(),
  roleTitle: varchar("role_title", { length: 255 }),
  department: varchar("department", { length: 30 }).notNull(),
  officeNumber: varchar("office_number", { length: 50 }),
  signatureUrl: text("signature_url"),
  signatureStorageKey: text("signature_storage_key"),
  active: boolean("active").default(true),
  hiredAt: timestamp("hired_at").notNull(),
  preferences: jsonb("preferences").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// --- AGENT ACTIVITY LOG ---
// A lightweight, agent-facing "recent activity" feed (GET /profile/activities)
// — distinct from the compliance-grade audit_logs table planned in
// ambassade-api (Phase 8). Nothing writes to this yet: the modules that
// would (demandes, documents, rendez-vous) don't exist before Phase 5+, so
// this starts out structurally ready but empty.
export const agentActivities = identity.table("agent_activities", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentUserId: uuid("agent_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 50 }).notNull(),
  targetType: varchar("target_type", { length: 30 }).notNull(),
  targetLabel: varchar("target_label", { length: 255 }).notNull(),
  targetId: varchar("target_id", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// --- OTP VERIFICATIONS ---
export const otps = identity.table("otps", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("email_phone", { length: 255 }).notNull(),
  codeHash: varchar("code_hash", { length: 255 }).notNull(),
  channel: varchar("channel", { length: 10 }).notNull(), // email | sms
  purpose: varchar("purpose", { length: 20 }).notNull(), // signup | mfa | reset
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
});

// --- SESSIONS ---
export const sessions = identity.table("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  refreshTokenHash: varchar("refresh_token_hash", { length: 255 }).notNull(),
  ip: varchar("ip", { length: 100 }),
  userAgent: text("user_agent"),
  // "Rester connecté" — décide la durée de vie du refresh token (30j vs
  // ~12h) à la connexion ET à chaque rotation (/auth/refresh relit cette
  // colonne pour reconduire le même choix, voir auth.service.ts).
  rememberMe: boolean("remember_me").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  revokedAt: timestamp("revoked_at"),
});
