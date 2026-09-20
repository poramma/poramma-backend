import { pgSchema, uuid, varchar, boolean } from "drizzle-orm/pg-core";

// Miroir en lecture seule de identity.roles / identity.user_roles — même base
// Postgres, autre schéma. Sert uniquement à retrouver les administrateurs pour
// les notifier. Volontairement ABSENT de drizzle.config.ts : ces tables
// appartiennent à identity-api, aucune migration n'est générée ici.
const identity = pgSchema("identity");

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
