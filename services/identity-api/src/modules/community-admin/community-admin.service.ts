import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../../db/connection";
import { agents, roles, sessions, userProfiles, userRoles, users } from "../../db/schema.identity";
import { ConflictError, ForbiddenError, NotFoundError } from "@poramma/utils";
import { revokeSession } from "@poramma/cache";
import { writeAudit } from "../../shared/audit";

/**
 * Administration de la plateforme COMMUNAUTAIRE — côté écriture sur identity.*
 * (communaute-api n'écrit jamais ici, voir son module admin pour la lecture).
 *
 * Deux garde-fous structurent tout le module :
 *  - les « membres » sont les comptes SANS fiche agent ni rôle actif : un agent
 *    de l'ambassade n'est jamais atteignable par ces routes (404) ;
 *  - l'équipe n'est faite que de rôles de portée COMMUNITY (rôles COMMUNITY_*),
 *    jamais de rôles de l'ambassade.
 */

export const TEAM_ROLES = ["COMMUNITY_ADMIN", "COMMUNITY_SUPPORT"] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

interface Caller {
  userId: string;
  roleName: string | null;
}

/** Un membre = ni agent, ni titulaire d'un rôle actif. */
async function assertMember(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError("Membre introuvable");
  const [agent] = await db.select({ id: agents.id }).from(agents).where(eq(agents.userId, userId)).limit(1);
  const [role] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.isActive, true)))
    .limit(1);
  if (agent || role) throw new NotFoundError("Membre introuvable");
  return user;
}

async function revokeAllSessions(userId: string) {
  const active = await db.select({ id: sessions.id }).from(sessions).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  await db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  // Redis : bloque aussi un access token déjà émis, sans attendre son expiration.
  await Promise.all(active.map((s) => revokeSession(s.id)));
}

// ── Membres ──────────────────────────────────────────────────────────────

/** Suspend ou réactive un membre. Une suspension coupe immédiatement toutes ses sessions. */
export async function setMemberStatus(targetId: string, status: "SUSPENDED" | "ACTIVE", caller: Caller, reason: string | null, ip?: string | null, ua?: string | null) {
  if (targetId === caller.userId) throw new ForbiddenError("Vous ne pouvez pas modifier votre propre compte");
  const user = await assertMember(targetId);

  const next = status === "SUSPENDED" ? "SUSPENDED" : user.emailVerified ? "VERIFIED" : "UNVERIFIED";
  if (user.status === next) return { id: targetId, status: next };

  await db.update(users).set({ status: next, updatedAt: new Date() }).where(eq(users.id, targetId));
  if (status === "SUSPENDED") await revokeAllSessions(targetId);

  await writeAudit({
    action: status === "SUSPENDED" ? "SUSPEND" : "REACTIVATE",
    entityType: "MEMBRE",
    entityId: targetId,
    actor: caller,
    severity: "WARNING",
    entitySnapshot: { from: { status: user.status }, to: { status: next } },
    details: { reason },
    ip,
    ua,
  });
  return { id: targetId, status: next };
}

// ── Équipe d'administration communautaire ────────────────────────────────

async function roleByName(name: string) {
  const [role] = await db.select().from(roles).where(and(eq(roles.name, name), eq(roles.scope, "COMMUNITY")));
  if (!role) throw new NotFoundError("Rôle introuvable");
  return role;
}

export async function listTeam() {
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      status: users.status,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      role: roles.name,
      assignedAt: userRoles.assignedAt,
    })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .innerJoin(users, eq(users.id, userRoles.userId))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(and(eq(roles.scope, "COMMUNITY"), eq(userRoles.isActive, true)))
    .orderBy(roles.level, users.email);
  return rows.map((r) => ({ ...r, name: [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email }));
}

async function activeAdminCount(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(distinct ${userRoles.userId})::int` })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(roles.name, "COMMUNITY_ADMIN"), eq(userRoles.isActive, true)));
  return row?.n ?? 0;
}

/** Donne un rôle d'équipe à un membre existant (désigné par son email). */
export async function addTeamMember(email: string, roleName: TeamRole, caller: Caller, ip?: string | null, ua?: string | null) {
  const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
  if (!user) throw new NotFoundError("Aucun compte avec cet email : la personne doit d'abord créer son compte sur la plateforme.");
  await assertMember(user.id); // refuse un agent de l'ambassade ou quelqu'un déjà dans l'équipe
  const role = await roleByName(roleName);

  await db.insert(userRoles).values({ userId: user.id, roleId: role.id, assignedBy: caller.userId, isActive: true });
  await writeAudit({
    action: "ASSIGN_ROLE",
    entityType: "EQUIPE_COMMUNAUTE",
    entityId: user.id,
    actor: caller,
    severity: "WARNING",
    details: { role: roleName, email: user.email },
    ip,
    ua,
  });
  return { userId: user.id, role: roleName };
}

/** Change le rôle d'un membre de l'équipe (le dernier administrateur ne peut pas être rétrogradé). */
export async function changeTeamRole(targetId: string, roleName: TeamRole, caller: Caller, ip?: string | null, ua?: string | null) {
  const current = (await listTeam()).find((m) => m.userId === targetId);
  if (!current) throw new NotFoundError("Membre de l'équipe introuvable");
  if (current.role === roleName) return { userId: targetId, role: roleName };
  if (current.role === "COMMUNITY_ADMIN" && (targetId === caller.userId || (await activeAdminCount()) <= 1)) {
    throw new ConflictError("Il doit toujours rester au moins un administrateur de la communauté.");
  }
  const role = await roleByName(roleName);

  await db.transaction(async (tx) => {
    const teamRoleIds = (await tx.select({ id: roles.id }).from(roles).where(eq(roles.scope, "COMMUNITY"))).map((r) => r.id);
    await tx.update(userRoles).set({ isActive: false }).where(and(eq(userRoles.userId, targetId), inArray(userRoles.roleId, teamRoleIds)));
    await tx.insert(userRoles).values({ userId: targetId, roleId: role.id, assignedBy: caller.userId, isActive: true });
  });
  await revokeAllSessions(targetId); // le jeton porte les permissions : on force une reconnexion avec le nouveau rôle

  await writeAudit({
    action: "CHANGE_ROLE",
    entityType: "EQUIPE_COMMUNAUTE",
    entityId: targetId,
    actor: caller,
    severity: "WARNING",
    entitySnapshot: { from: { role: current.role }, to: { role: roleName } },
    ip,
    ua,
  });
  return { userId: targetId, role: roleName };
}

/** Retire un membre de l'équipe : il redevient un simple membre de la communauté. */
export async function removeTeamMember(targetId: string, caller: Caller, ip?: string | null, ua?: string | null) {
  if (targetId === caller.userId) throw new ForbiddenError("Vous ne pouvez pas retirer votre propre accès");
  const current = (await listTeam()).find((m) => m.userId === targetId);
  if (!current) throw new NotFoundError("Membre de l'équipe introuvable");
  if (current.role === "COMMUNITY_ADMIN" && (await activeAdminCount()) <= 1) {
    throw new ConflictError("Il doit toujours rester au moins un administrateur de la communauté.");
  }

  const teamRoleIds = (await db.select({ id: roles.id }).from(roles).where(eq(roles.scope, "COMMUNITY"))).map((r) => r.id);
  await db.update(userRoles).set({ isActive: false }).where(and(eq(userRoles.userId, targetId), inArray(userRoles.roleId, teamRoleIds)));
  await revokeAllSessions(targetId);

  await writeAudit({
    action: "REMOVE_ROLE",
    entityType: "EQUIPE_COMMUNAUTE",
    entityId: targetId,
    actor: caller,
    severity: "WARNING",
    details: { role: current.role, email: current.email },
    ip,
    ua,
  });
}
