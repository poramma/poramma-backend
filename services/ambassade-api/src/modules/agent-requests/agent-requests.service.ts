import crypto from "crypto";
import { and, desc, eq, ilike, inArray, or, sql, SQL } from "drizzle-orm";
import { db } from "../../db/connection";
import { agentRequests } from "../../db/schema.agent-requests";
import { identityRoles, identityUserRoles } from "../../db/schema.identity-roles-readonly";
import { agentServiceAssignments } from "../../db/schema.rendezvous";
import { subServices } from "../../db/schema.ambassade";
import { identityLogic, identitySchema, notificationsLogic } from "@poramma/ambassade-core";
import { ConflictError, NotFoundError, ValidationError } from "@poramma/utils";
import { paginationMeta } from "@poramma/dto";
import { getAgentByUserId } from "../../shared/enrich";
import { writeAudit } from "../audit/audit.service";

const { identityUsers, identityUserProfiles } = identitySchema;

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

interface Actor {
  userId: string;
  roleName: string | null;
}

const OPEN_STATUSES = ["PENDING", "IN_PROGRESS"];
const FINAL_STATUSES = ["APPROVED", "REJECTED", "RESOLVED"];
/** Nombre maximum de demandes ouvertes par agent — évite le spam vers l'administration. */
const MAX_OPEN_PER_AGENT = 5;

const KIND_LABEL: Record<string, string> = { ACCESS_REQUEST: "Demande d'accès", REPORT: "Signalement" };
const STATUS_LABEL: Record<string, string> = { IN_PROGRESS: "prise en charge", APPROVED: "acceptée", REJECTED: "refusée", RESOLVED: "résolue" };

type Row = typeof agentRequests.$inferSelect;

async function enrich(rows: Row[]) {
  const users = await identityLogic.getUsersByIds(
    db,
    rows.flatMap((r) => [r.requesterUserId, r.handledBy].filter((x): x is string => !!x))
  );
  const subIds = [...new Set(rows.map((r) => r.targetSubServiceId).filter((x): x is string => !!x))];
  const subs = subIds.length ? await db.select({ id: subServices.id, name: subServices.name }).from(subServices).where(inArray(subServices.id, subIds)) : [];
  const nameOf = (id: string | null) => {
    const u = id ? users.get(id) : undefined;
    return u?.profile ? [u.profile.firstName, u.profile.lastName].filter(Boolean).join(" ") : null;
  };
  return rows.map((r) => ({
    ...r,
    requester: { id: r.requesterUserId, name: nameOf(r.requesterUserId), email: users.get(r.requesterUserId)?.email ?? null },
    handledByName: nameOf(r.handledBy),
    targetSubService: subs.find((s) => s.id === r.targetSubServiceId) ?? null,
  }));
}

/** Utilisateurs ayant le rôle ADMIN (actif) — destinataires des nouvelles demandes. */
async function adminUserIds(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ userId: identityUserRoles.userId })
    .from(identityUserRoles)
    .innerJoin(identityRoles, eq(identityRoles.id, identityUserRoles.roleId))
    .where(and(eq(identityRoles.name, "ADMIN"), eq(identityUserRoles.isActive, true)));
  return rows.map((r) => r.userId);
}

export async function createRequest(
  actor: Actor,
  data: { kind: string; category: string; subject: string; description: string; targetSubServiceId?: string; targetPermission?: string }
) {
  const [{ open }] = await db
    .select({ open: sql<number>`count(*)::int` })
    .from(agentRequests)
    .where(and(eq(agentRequests.requesterUserId, actor.userId), inArray(agentRequests.status, OPEN_STATUSES)));
  if (open >= MAX_OPEN_PER_AGENT) {
    throw new ValidationError(`Vous avez déjà ${MAX_OPEN_PER_AGENT} demandes en attente de traitement. Attendez la réponse de l'administration.`, {
      _: ["too many open requests"],
    });
  }

  if (data.targetSubServiceId) {
    const [sub] = await db.select({ id: subServices.id }).from(subServices).where(eq(subServices.id, data.targetSubServiceId));
    if (!sub) throw new NotFoundError("Service introuvable");
  }

  const [row] = await db
    .insert(agentRequests)
    .values({
      id: newId("areq"),
      requesterUserId: actor.userId,
      kind: data.kind,
      category: data.category,
      subject: data.subject,
      description: data.description,
      targetSubServiceId: data.targetSubServiceId ?? null,
      targetPermission: data.targetPermission ?? null,
    })
    .returning();

  await writeAudit({
    action: "CREATE",
    entityType: "DEMANDE_AGENT",
    entityId: row.id,
    actor,
    severity: data.category === "SECURITY" ? "WARNING" : "INFO",
    details: { kind: data.kind, category: data.category, subject: data.subject },
  });

  const requesterName = await identityLogic.getActorName(db, actor.userId);
  for (const adminId of await adminUserIds()) {
    if (adminId === actor.userId) continue;
    await notificationsLogic.createNotification(db, {
      userId: adminId,
      type: "ADMIN",
      title: data.kind === "REPORT" ? "Nouveau signalement d'un agent" : "Nouvelle demande d'accès d'un agent",
      body: `${requesterName} — ${data.subject}`,
      payload: { agentRequestId: row.id },
      actionUrl: "/agents/demandes",
    });
  }

  return (await enrich([row]))[0];
}

export async function listMine(userId: string) {
  const rows = await db.select().from(agentRequests).where(eq(agentRequests.requesterUserId, userId)).orderBy(desc(agentRequests.createdAt));
  return enrich(rows);
}

export async function listAll(filters: { status?: string; kind?: string; category?: string; search?: string; page?: number; limit?: number }) {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(agentRequests.status, filters.status));
  if (filters.kind) conditions.push(eq(agentRequests.kind, filters.kind));
  if (filters.category) conditions.push(eq(agentRequests.category, filters.category));
  if (filters.search) {
    const s = `%${filters.search.trim()}%`;
    const requesterIds = db
      .select({ id: identityUsers.id })
      .from(identityUsers)
      .leftJoin(identityUserProfiles, eq(identityUserProfiles.userId, identityUsers.id))
      .where(or(ilike(identityUsers.email, s), ilike(identityUserProfiles.firstName, s), ilike(identityUserProfiles.lastName, s)));
    conditions.push(or(ilike(agentRequests.subject, s), ilike(agentRequests.description, s), inArray(agentRequests.requesterUserId, requesterIds))!);
  }

  const where = conditions.length ? and(...conditions) : undefined;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;

  const [rows, [{ total }], [{ open }]] = await Promise.all([
    db
      .select()
      .from(agentRequests)
      .where(where)
      .orderBy(desc(agentRequests.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ total: sql<number>`count(*)::int` }).from(agentRequests).where(where),
    db.select({ open: sql<number>`count(*)::int` }).from(agentRequests).where(inArray(agentRequests.status, OPEN_STATUSES)),
  ]);

  return { data: await enrich(rows), meta: { ...paginationMeta(page, limit, total), openCount: open } };
}

export async function getOwnerId(id: string): Promise<string> {
  const [row] = await db.select({ userId: agentRequests.requesterUserId }).from(agentRequests).where(eq(agentRequests.id, id));
  if (!row) throw new NotFoundError("Demande introuvable");
  return row.userId;
}

export async function getRequest(id: string) {
  const [row] = await db.select().from(agentRequests).where(eq(agentRequests.id, id));
  if (!row) throw new NotFoundError("Demande introuvable");
  return (await enrich([row]))[0];
}

/** Traitement par l'administrateur : décision + réponse écrite qui revient à l'agent (in-app + email). */
export async function processRequest(id: string, data: { status: string; response?: string; applyAssignment?: boolean }, actor: Actor) {
  const [existing] = await db.select().from(agentRequests).where(eq(agentRequests.id, id));
  if (!existing) throw new NotFoundError("Demande introuvable");
  if (FINAL_STATUSES.includes(existing.status)) throw new ConflictError("Cette demande a déjà été traitée.");
  if (existing.requesterUserId === actor.userId) throw new ConflictError("Vous ne pouvez pas traiter votre propre demande.");
  if (FINAL_STATUSES.includes(data.status) && !data.response?.trim()) {
    throw new ValidationError("Une réponse écrite est requise pour clore la demande.", { response: ["Required"] });
  }

  let assignmentCreated = false;
  if (data.status === "APPROVED" && existing.category === "SERVICE_ACCESS" && data.applyAssignment) {
    if (!existing.targetSubServiceId) throw new ValidationError("Aucun service cible sur cette demande.", { targetSubServiceId: ["Required"] });
    const agent = await getAgentByUserId(existing.requesterUserId);
    if (!agent) throw new ValidationError("Ce compte n'a pas de fiche agent : impossible de l'affecter.", { agent: ["not found"] });

    const [already] = await db
      .select({ id: agentServiceAssignments.id })
      .from(agentServiceAssignments)
      .where(
        and(
          eq(agentServiceAssignments.agentId, agent.id),
          eq(agentServiceAssignments.subServiceId, existing.targetSubServiceId),
          eq(agentServiceAssignments.active, true)
        )
      );
    if (!already) {
      await db.insert(agentServiceAssignments).values({
        id: newId("asg"),
        agentId: agent.id,
        subServiceId: existing.targetSubServiceId,
        assignedBy: actor.userId,
        isPrimary: false,
        active: true,
        validFrom: new Date().toISOString().slice(0, 10),
        notes: `Affectation créée à l'approbation de la demande ${existing.id}`,
      });
    }
    assignmentCreated = true;
  }

  const [updated] = await db
    .update(agentRequests)
    .set({
      status: data.status,
      adminResponse: data.response?.trim() || existing.adminResponse,
      handledBy: actor.userId,
      handledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(agentRequests.id, id))
    .returning();

  await writeAudit({
    action: "PROCESS_REQUEST",
    entityType: "DEMANDE_AGENT",
    entityId: id,
    actor,
    severity: data.status === "APPROVED" && assignmentCreated ? "WARNING" : "INFO",
    entitySnapshot: { from: existing.status, to: data.status },
    details: { category: existing.category, requester: existing.requesterUserId, assignmentCreated },
  });

  await notificationsLogic.createNotification(db, {
    userId: existing.requesterUserId,
    type: "ADMIN",
    title: `${KIND_LABEL[existing.kind] ?? "Demande"} ${STATUS_LABEL[data.status] ?? "mise à jour"}`,
    body: `« ${existing.subject} » — ${data.response?.trim() ?? "Votre demande est en cours de traitement."}`,
    payload: { agentRequestId: id, status: data.status },
    actionUrl: "/profile",
    email: {
      subject: `${KIND_LABEL[existing.kind] ?? "Demande"} ${STATUS_LABEL[data.status] ?? "mise à jour"} — ${existing.subject}`,
      actionLabel: "Voir mon profil",
    },
  });

  return { ...(await enrich([updated]))[0], assignmentCreated };
}
