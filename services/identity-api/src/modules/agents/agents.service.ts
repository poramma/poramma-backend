import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "../../db/connection";
import { users, userProfiles, agents, roles, userRoles, sessions } from "../../db/schema.identity";
import { eq, and, isNull } from "drizzle-orm";
import { NotFoundError, ConflictError, ForbiddenError } from "@poramma/utils";
import { sendMail } from "@poramma/mailer";
import { buildFullUser } from "../auth/auth.service";
import { writeAudit } from "../../shared/audit";
import { revokeSession } from "@poramma/cache";

interface CreateAgentInput {
  email: string;
  password?: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  matricule: string;
  roleTitle?: string | null;
  department: string;
  officeNumber?: string | null;
  roleId: string;
  active?: boolean;
}

function generateTempPassword(): string {
  // 12 random bytes -> base64url, trimmed to a readable length. Not meant
  // to be memorized: the agent is expected to change it on first login.
  return crypto.randomBytes(9).toString("base64url");
}

/** Assembles the Agent shape (agent row + nested full Utilisateur). */
async function toAgentShape(agentRow: typeof agents.$inferSelect) {
  const user = await buildFullUser(agentRow.userId);
  return {
    id: agentRow.id,
    userId: agentRow.userId,
    user,
    matricule: agentRow.matricule,
    roleTitle: agentRow.roleTitle,
    department: agentRow.department,
    officeNumber: agentRow.officeNumber,
    signatureUrl: agentRow.signatureUrl,
    active: agentRow.active,
    hiredAt: agentRow.hiredAt,
    createdAt: agentRow.createdAt,
    updatedAt: agentRow.updatedAt,
    // Populated once ambassade-api's schedule tables exist (Phase 6).
    assignments: [] as unknown[],
    availabilities: [] as unknown[],
  };
}

export async function listAgents(filters: { search?: string; department?: string }) {
  const conditions = [];
  if (filters.department) conditions.push(eq(agents.department, filters.department));

  const rows = await db
    .select()
    .from(agents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(agents.createdAt);

  const shaped = await Promise.all(rows.map(toAgentShape));

  // Search matches name/email/matricule — done in application code since it
  // spans the joined user/profile, which toAgentShape already resolved.
  if (filters.search) {
    const q = filters.search.toLowerCase();
    return shaped.filter((a) => {
      const fullName = `${a.user.profile?.firstName ?? ""} ${a.user.profile?.lastName ?? ""}`.toLowerCase();
      return fullName.includes(q) || a.user.email.toLowerCase().includes(q) || a.matricule.toLowerCase().includes(q);
    });
  }
  return shaped;
}

export async function getAgent(id: string) {
  const [row] = await db.select().from(agents).where(eq(agents.id, id));
  if (!row) throw new NotFoundError("Agent introuvable");
  return toAgentShape(row);
}

export async function createAgent(data: CreateAgentInput, createdBy: string) {
  const [existingEmail] = await db.select().from(users).where(eq(users.email, data.email));
  if (existingEmail) throw new ConflictError("Email déjà utilisé");

  const [existingMatricule] = await db.select().from(agents).where(eq(agents.matricule, data.matricule));
  if (existingMatricule) throw new ConflictError("Matricule déjà utilisé");

  const [role] = await db.select().from(roles).where(eq(roles.id, data.roleId));
  if (!role) throw new NotFoundError("Rôle introuvable");

  const tempPassword = data.password ?? generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const agentRow = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: data.email,
        phone: data.phone ?? null,
        passwordHash,
        status: "VERIFIED", // admin-created accounts skip the public OTP flow entirely
        emailVerified: true,
      })
      .returning();

    await tx.insert(userProfiles).values({
      userId: user.id,
      firstName: data.firstName,
      lastName: data.lastName,
      userType: "other",
    });

    const [agent] = await tx
      .insert(agents)
      .values({
        userId: user.id,
        matricule: data.matricule,
        roleTitle: data.roleTitle ?? null,
        department: data.department,
        officeNumber: data.officeNumber ?? null,
        active: data.active ?? true,
        hiredAt: new Date(),
      })
      .returning();

    await tx.insert(userRoles).values({
      userId: user.id,
      roleId: data.roleId,
      assignedBy: createdBy,
      isActive: true,
    });

    return agent;
  });

  await sendMail({
    to: data.email,
    subject: "Votre compte Poramma a été créé",
    html: `
      <h2>Bienvenue sur Poramma</h2>
      <p>Un compte agent a été créé pour vous, avec le matricule <strong>${data.matricule}</strong>.</p>
      <p>Identifiant : ${data.email}</p>
      <p>Mot de passe temporaire : <strong>${tempPassword}</strong></p>
      <p>Nous vous recommandons de le changer dès votre première connexion.</p>
    `,
  });

  await writeAudit({
    action: "CREATE",
    entityType: "AGENT",
    entityId: agentRow.id,
    actor: { userId: createdBy, roleName: null },
    details: { matricule: data.matricule, department: data.department },
  });

  return toAgentShape(agentRow);
}

export async function updateAgent(
  id: string,
  data: Partial<{
    email: string;
    phone: string | null;
    firstName: string;
    lastName: string;
    matricule: string;
    roleTitle: string | null;
    department: string;
    officeNumber: string | null;
    active: boolean;
  }>
) {
  const [existing] = await db.select().from(agents).where(eq(agents.id, id));
  if (!existing) throw new NotFoundError("Agent introuvable");

  if (data.email || data.phone !== undefined) {
    await db
      .update(users)
      .set({
        ...(data.email ? { email: data.email } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.userId));
  }

  if (data.firstName || data.lastName) {
    await db
      .update(userProfiles)
      .set({
        ...(data.firstName ? { firstName: data.firstName } : {}),
        ...(data.lastName ? { lastName: data.lastName } : {}),
        updatedAt: new Date(),
      })
      .where(eq(userProfiles.userId, existing.userId));
  }

  const agentPatch: Partial<typeof agents.$inferInsert> = {};
  if (data.matricule) agentPatch.matricule = data.matricule;
  if (data.roleTitle !== undefined) agentPatch.roleTitle = data.roleTitle;
  if (data.department) agentPatch.department = data.department;
  if (data.officeNumber !== undefined) agentPatch.officeNumber = data.officeNumber;
  if (data.active !== undefined) agentPatch.active = data.active;
  agentPatch.updatedAt = new Date();

  const [updated] = await db.update(agents).set(agentPatch).where(eq(agents.id, id)).returning();
  return toAgentShape(updated);
}

/**
 * Soft delete only (mission prompt USR-03): suspends the linked user
 * account and deactivates the agent row, never a hard row delete. Refuses
 * to let an ADMIN suspend their own account (USR-05 self-protection).
 */
export async function deleteAgent(id: string, callerUserId: string) {
  const [existing] = await db.select().from(agents).where(eq(agents.id, id));
  if (!existing) throw new NotFoundError("Agent introuvable");
  if (existing.userId === callerUserId) {
    throw new ForbiddenError("Vous ne pouvez pas suspendre votre propre compte");
  }

  await db.update(users).set({ status: "SUSPENDED", updatedAt: new Date() }).where(eq(users.id, existing.userId));
  await db.update(agents).set({ active: false, updatedAt: new Date() }).where(eq(agents.id, id));
  // JWT-03 closed: requireAuth now checks Redis per-request (isSessionActive),
  // so revoking here blocks an already-issued access token immediately
  // instead of only at its next refresh.
  const activeSessions = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.userId, existing.userId), isNull(sessions.revokedAt)));
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, existing.userId), isNull(sessions.revokedAt)));
  await Promise.all(activeSessions.map((s) => revokeSession(s.id)));

  await writeAudit({
    action: "SUSPEND",
    entityType: "AGENT",
    entityId: id,
    actor: { userId: callerUserId, roleName: null },
    severity: "WARNING",
  });
}
