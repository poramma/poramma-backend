import { text, varchar, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { ambassade } from "./schema.ambassade";

/**
 * Demandes d'accès et signalements adressés PAR un agent À l'administration :
 * accès à un service, changement de permission ou de rôle, problème
 * d'affectation, signalement de sécurité… L'administrateur les traite
 * (en cours / approuvé / refusé / résolu) avec une réponse écrite qui revient
 * à l'agent. `requesterUserId` désigne identity.users (même base, autre schéma).
 */
export const agentRequests = ambassade.table(
  "agent_requests",
  {
    id: text("id").primaryKey(),
    requesterUserId: uuid("requester_user_id").notNull(),
    kind: varchar("kind", { length: 20 }).notNull(), // ACCESS_REQUEST | REPORT
    category: varchar("category", { length: 30 }).notNull(),
    subject: varchar("subject", { length: 200 }).notNull(),
    description: text("description").notNull(),
    targetSubServiceId: text("target_sub_service_id"),
    targetPermission: varchar("target_permission", { length: 100 }),
    status: varchar("status", { length: 20 }).notNull().default("PENDING"), // PENDING | IN_PROGRESS | APPROVED | REJECTED | RESOLVED
    adminResponse: text("admin_response"),
    handledBy: uuid("handled_by"),
    handledAt: timestamp("handled_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => [index("agent_requests_status_idx").on(t.status, t.createdAt), index("agent_requests_requester_idx").on(t.requesterUserId)]
);
