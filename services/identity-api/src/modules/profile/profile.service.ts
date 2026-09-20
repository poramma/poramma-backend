import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "../../db/connection";
import { users, userProfiles, agents, agentActivities } from "../../db/schema.identity";
import { agentServiceAssignments, agentAvailabilities, agentExceptions, subServices, services } from "../../db/schema.ambassade-readonly";
import { eq, desc, inArray } from "drizzle-orm";
import { NotFoundError, UnauthorizedError } from "@poramma/utils";
import { uploadObject, getObject, deleteObject } from "@poramma/storage";
import { buildFullUser } from "../auth/auth.service";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_").slice(-150);
}

const DEFAULT_PREFERENCES = {
  theme: "system" as const,
  language: "fr" as const,
  notificationsEmail: true,
  notificationsInApp: true,
  notificationTypes: {
    demandeAssigned: true,
    documentPending: true,
    rendezVousReminder: true,
  },
};

async function getAgentRow(userId: string) {
  const [agent] = await db.select().from(agents).where(eq(agents.userId, userId));
  if (!agent) throw new NotFoundError("Aucun profil agent pour cet utilisateur");
  return agent;
}

/** GET /profile — matches the frontend's AgentProfileData shape. */
export async function getMyProfile(userId: string) {
  const agent = await getAgentRow(userId);
  const fullUser = await buildFullUser(userId);

  const [assignments, availabilities, exceptions] = await Promise.all([
    db.select().from(agentServiceAssignments).where(eq(agentServiceAssignments.agentId, agent.id)),
    db.select().from(agentAvailabilities).where(eq(agentAvailabilities.agentId, agent.id)),
    db.select().from(agentExceptions).where(eq(agentExceptions.agentId, agent.id)),
  ]);

  // Nomme chaque affectation (service + sous-service) : sans cela le profil n affichait que des identifiants.
  const subIds = [...new Set(assignments.map((a) => a.subServiceId))];
  const subRows = subIds.length
    ? await db
        .select({ id: subServices.id, name: subServices.name, code: subServices.code, description: subServices.description, serviceName: services.name, serviceId: services.id })
        .from(subServices)
        .leftJoin(services, eq(services.id, subServices.serviceId))
        .where(inArray(subServices.id, subIds))
    : [];
  const namedAssignments = assignments
    .map((a) => {
      const sub = subRows.find((r) => r.id === a.subServiceId);
      return {
        ...a,
        subService: sub ? { id: sub.id, name: sub.name, code: sub.code, description: sub.description, service: { id: sub.serviceId, name: sub.serviceName } } : null,
      };
    })
    .sort((x, y) => Number(!!y.active) - Number(!!x.active) || Number(!!y.isPrimary) - Number(!!x.isPrimary));

  return {
    agent: {
      id: agent.id,
      userId: agent.userId,
      user: fullUser,
      matricule: agent.matricule,
      roleTitle: agent.roleTitle,
      department: agent.department,
      officeNumber: agent.officeNumber,
      signatureUrl: agent.signatureUrl,
      active: agent.active,
      hiredAt: agent.hiredAt,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    },
    user: fullUser,
    profile: fullUser.profile,
    roles: fullUser.roles,
    activeRole: fullUser.activeRole,
    // Read cross-schema from ambassade-api's agent-schedule tables (Phase 6)
    // — see schema.ambassade-readonly.ts.
    assignments: namedAssignments,
    availabilities,
    exceptions,
    preferences: { ...DEFAULT_PREFERENCES, ...(agent.preferences as object) },
    activities: await listActivities(userId, 0, 20),
  };
}

export async function updateMyProfile(userId: string, data: Record<string, unknown>) {
  const [updated] = await db
    .update(userProfiles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(userProfiles.userId, userId))
    .returning();
  if (!updated) throw new NotFoundError("Profil introuvable");
  return updated;
}

export async function updateMyPreferences(userId: string, patch: Record<string, unknown>) {
  const agent = await getAgentRow(userId);
  const merged = { ...DEFAULT_PREFERENCES, ...(agent.preferences as object), ...patch };
  await db.update(agents).set({ preferences: merged, updatedAt: new Date() }).where(eq(agents.id, agent.id));
  return merged;
}

export async function updateMyPassword(userId: string, currentPassword: string, newPassword: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError("Utilisateur introuvable");

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!matches) throw new UnauthorizedError("Mot de passe actuel incorrect");

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

/** POST /profile/signature — remplace le fichier existant s'il y en avait un (best-effort cleanup). */
export async function uploadSignature(userId: string, buffer: Buffer, originalName: string, mimeType: string) {
  const agent = await getAgentRow(userId);

  const key = `signatures/${agent.id}/${crypto.randomUUID()}-${sanitizeFilename(originalName)}`;
  await uploadObject(key, buffer, mimeType);

  if (agent.signatureStorageKey) {
    try {
      await deleteObject(agent.signatureStorageKey);
    } catch {
      // best-effort — un fichier orphelin dans MinIO n'est pas bloquant
    }
  }

  const [updated] = await db
    .update(agents)
    .set({ signatureUrl: "/profile/signature", signatureStorageKey: key, updatedAt: new Date() })
    .where(eq(agents.id, agent.id))
    .returning();
  return { signatureUrl: updated.signatureUrl };
}

/** GET /profile/signature — sert le fichier (MinIO n'est pas joignable depuis le navigateur, pas d'URL directe). */
export async function getSignatureFile(userId: string) {
  const agent = await getAgentRow(userId);
  if (!agent.signatureStorageKey) throw new NotFoundError("Aucune signature enregistrée");
  const { buffer, contentType } = await getObject(agent.signatureStorageKey);
  return { buffer, contentType: contentType ?? "application/octet-stream" };
}

/** DELETE /profile/signature */
export async function deleteSignature(userId: string) {
  const agent = await getAgentRow(userId);
  if (agent.signatureStorageKey) {
    try {
      await deleteObject(agent.signatureStorageKey);
    } catch {
      // best-effort
    }
  }
  await db.update(agents).set({ signatureUrl: null, signatureStorageKey: null, updatedAt: new Date() }).where(eq(agents.id, agent.id));
}

export async function listActivities(userId: string, offset: number, limit: number) {
  return db
    .select()
    .from(agentActivities)
    .where(eq(agentActivities.agentUserId, userId))
    .orderBy(desc(agentActivities.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Records one entry in the agent's activity feed. Not called by anything
 * yet — no module that would (demandes, documents, rendez-vous) exists
 * before Phase 5+. Exported now so those phases can just import and call
 * it instead of re-deriving the write path.
 */
export async function recordActivity(
  agentUserId: string,
  action: string,
  targetType: string,
  targetLabel: string,
  targetId: string
) {
  await db.insert(agentActivities).values({ agentUserId, action, targetType, targetLabel, targetId });
}
