import { integer, timestamp, uuid, varchar, text } from "drizzle-orm/pg-core";
import { ambassade } from "./services";

/**
 * Suivi de validation "communautaire" (historiquement nommé étudiants, mais
 * sert de mécanisme générique de statut d'inscription pour tout membre de la
 * communauté — étudiant, travailleur, migrant, autre) et de l'INUE. La
 * donnée brute (nom, université, bourse...) reste dans identity.* ; le
 * statut de validation et l'INUE sont possédés ici, dans le schéma
 * `ambassade` — voir le commentaire d'origine dans ambassade-api.
 */
export const etudiants = ambassade.table("etudiants", {
  id: text("id").primaryKey(),
  userId: uuid("user_id").notNull().unique(),
  status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING | VALIDATED | REJECTED | SUSPENDED
  inue: varchar("inue", { length: 20 }).unique(),
  inueAssignedAt: timestamp("inue_assigned_at"),
  inueAssignedBy: uuid("inue_assigned_by"),
  // Date de soumission du dossier d'enregistrement par le citoyen (null =
  // compte créé mais dossier pas encore soumis) — distingue "incomplet" de
  // "en attente de validation" sans ajouter de valeur de statut, pour ne pas
  // casser les vues staff qui filtrent sur PENDING/VALIDATED/REJECTED/SUSPENDED.
  submittedAt: timestamp("submitted_at"),
  reviewNote: text("review_note"),
  reviewedBy: uuid("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/** Compteur INUE par année — verrouillé en transaction au moment de l'attribution. */
export const inueSequences = ambassade.table("inue_sequences", {
  year: integer("year").primaryKey(),
  lastNumber: integer("last_number").notNull().default(0),
});
