import { pgSchema, uuid, varchar, boolean, timestamp, text } from "drizzle-orm/pg-core";

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
export const roles = identity.table("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
});

// --- USER ROLES (pivot) ---
export const userRoles = identity.table("user_roles", {
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roleId: uuid("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
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
  createdAt: timestamp("created_at").defaultNow(),
  revokedAt: timestamp("revoked_at"),
});
