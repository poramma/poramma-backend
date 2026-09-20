import { db } from "../db/connection";
import { subServices, services } from "../db/schema.ambassade";
import { identityAgents } from "../db/schema.identity-readonly";
import { agentServiceAssignments } from "../db/schema.rendezvous";
import { eq, and } from "drizzle-orm";
import { identityLogic } from "@poramma/ambassade-core";

/**
 * Shared cross-schema enrichment helpers (identity.users/agents + ambassade
 * sub-services) — used by both the demandes and rendezvous modules to build
 * their nested `user`/`agent`/`subService` response fields. getUser/
 * getActorName déplacées dans @poramma/ambassade-core (partagées avec
 * communaute-api) ; le reste (agents, affectations) reste local, staff-only.
 */

export const getActorName = (userId: string) => identityLogic.getActorName(db, userId);
export const getUser = (userId: string) => identityLogic.getUser(db, userId);

export async function getAgent(agentId: string) {
  const [agent] = await db.select().from(identityAgents).where(eq(identityAgents.id, agentId));
  if (!agent) return null;
  const user = await getUser(agent.userId);
  return { ...agent, user };
}

/** Comme getAgent, mais à partir de l'userId (ex: "quel agent a imprimé ceci ?"). */
export async function getAgentByUserId(userId: string) {
  const [agent] = await db.select().from(identityAgents).where(eq(identityAgents.userId, userId));
  if (!agent) return null;
  const user = await getUser(agent.userId);
  return { ...agent, user };
}

export async function getSubServiceShallow(id: string) {
  const [sub] = await db.select().from(subServices).where(eq(subServices.id, id));
  if (!sub) return null;
  const [service] = await db.select().from(services).where(eq(services.id, sub.serviceId));
  return { ...sub, basePrice: sub.basePrice != null ? Number(sub.basePrice) : null, service };
}

/**
 * Sous-services auxquels un agent (identifié par son userId) est activement
 * affecté — utilisé pour restreindre ce qu'un agent non-ADMIN peut voir/
 * traiter dans demandes et rendez-vous (carte blanche réservée à ADMIN, voir
 * [[poramma-backend-phase1]]). Un utilisateur sans fiche agent (pas de ligne
 * identity.agents) n'a aucune affectation → tableau vide → ne voit rien.
 */
export async function getAssignedSubServiceIds(userId: string): Promise<string[]> {
  const agent = await getAgentByUserId(userId);
  if (!agent) return [];
  const rows = await db
    .select({ subServiceId: agentServiceAssignments.subServiceId })
    .from(agentServiceAssignments)
    .where(and(eq(agentServiceAssignments.agentId, agent.id), eq(agentServiceAssignments.active, true)));
  return rows.map((r) => r.subServiceId);
}
