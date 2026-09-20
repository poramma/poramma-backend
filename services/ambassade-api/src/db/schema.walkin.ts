import { text, varchar, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { ambassade, subServices } from "./schema.ambassade";
import { demandes } from "./schema.demandes";
import { rendezVous } from "./schema.rendezvous";

/**
 * Registre de l'accueil : demandes formulées sur place, au guichet (personne qui
 * se présente sans passer par la plateforme, ou qui a besoin d'un renseignement).
 * userId / assignedAgentId / registeredBy pointent vers identity.* (pas de FK cross-schema).
 */
export const walkInRequests = ambassade.table(
  "walk_in_requests",
  {
    id: text("id").primaryKey(),
    /** Numéro d'ordre du jour (ACC-20260920-003), remis au visiteur. */
    reference: varchar("reference", { length: 30 }).notNull().unique(),
    visitorName: varchar("visitor_name", { length: 150 }).notNull(),
    visitorPhone: varchar("visitor_phone", { length: 30 }),
    /** Compte de la plateforme, si le visiteur en a un (retrouvé par l'agent d'accueil). */
    userId: uuid("user_id"),
    subServiceId: text("sub_service_id").references(() => subServices.id),
    category: varchar("category", { length: 20 }).notNull().default("INFORMATION"), // INFORMATION | DEPOT | RETRAIT | SUIVI | AUTRE
    subject: text("subject").notNull(),
    notes: text("notes"),
    status: varchar("status", { length: 20 }).notNull().default("WAITING"), // WAITING | IN_SERVICE | DONE | REDIRECTED | ABANDONED
    priority: varchar("priority", { length: 10 }).notNull().default("NORMAL"), // NORMAL | URGENT
    assignedAgentId: uuid("assigned_agent_id"),
    /** Dossier créé à partir de cette demande sur place. */
    demandeId: text("demande_id").references(() => demandes.id),
    rendezVousId: text("rendez_vous_id").references(() => rendezVous.id),
    outcome: text("outcome"),
    /** Service vers lequel le visiteur a été orienté (statut REDIRECTED) ; ses agents en sont prévenus. */
    redirectedSubServiceId: text("redirected_sub_service_id").references(() => subServices.id),
    registeredBy: uuid("registered_by").notNull(),
    startedAt: timestamp("started_at"),
    closedAt: timestamp("closed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("walk_in_requests_created_idx").on(t.createdAt), index("walk_in_requests_status_idx").on(t.status)]
);
