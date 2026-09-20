import { pgSchema, uuid, varchar, timestamp, boolean } from "drizzle-orm/pg-core";

// Miroir en lecture seule des colonnes identity-api dont ambassade-api ET
// communaute-api ont besoin — même base Postgres physique, schéma
// différent. Ni ambassade-api ni communaute-api n'écrivent jamais dans ces
// tables (propriété exclusive d'identity-api) ; ce fichier n'est délibérément
// pas géré par drizzle-kit ici (pas de migrations générées depuis ce
// package pour des tables qu'il ne possède pas).
export const identity = pgSchema("identity");

export const identityUsers = identity.table("users", {
  id: uuid("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  status: varchar("status", { length: 20 }),
  createdAt: timestamp("created_at"),
});

export const identityUserProfiles = identity.table("user_profiles", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  inue: varchar("inue", { length: 50 }),
  userType: varchar("user_type", { length: 20 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  nationality: varchar("nationality", { length: 100 }),
  address: varchar("address", { length: 255 }),
  city: varchar("city", { length: 255 }),
  country: varchar("country", { length: 255 }),
});

export const identityStudentProfiles = identity.table("student_profiles", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  university: varchar("university", { length: 255 }),
  faculty: varchar("faculty", { length: 255 }),
  studyLevel: varchar("study_level", { length: 100 }),
});

export const identityStudentScholarships = identity.table("student_scholarships", {
  id: uuid("id").primaryKey(),
  studentProfileId: uuid("student_profile_id").notNull(),
  isRecipient: boolean("is_recipient"),
  decisionNumber: varchar("decision_number", { length: 100 }),
  promotion: varchar("promotion", { length: 100 }),
});

export const identityWorkerProfiles = identity.table("worker_profiles", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  employer: varchar("employer", { length: 255 }),
  profession: varchar("profession", { length: 255 }),
  contractType: varchar("contract_type", { length: 100 }),
});

// Fiche agent (lecture seule) — intitulé de poste du Conseiller Culturel, montré à visage découvert.
export const identityAgents = identity.table("agents", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  roleTitle: varchar("role_title", { length: 255 }),
  active: boolean("active"),
});

// Rôles (lecture seule) — retrouver les administrateurs à notifier (tickets de support…).
export const identityRoles = identity.table("roles", {
  id: uuid("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
});

export const identityUserRoles = identity.table("user_roles", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  roleId: uuid("role_id").notNull(),
  isActive: boolean("is_active"),
});
