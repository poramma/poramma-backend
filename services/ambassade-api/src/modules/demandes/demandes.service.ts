import crypto from "crypto";
import { db } from "../../db/connection";
import { demandes, demandeRequirements, demandeHistories, demandeComments, demandeDocuments } from "../../db/schema.demandes";
import { eq, and, desc, ilike, lt, gt, ne, inArray, or, sql } from "drizzle-orm";
import { NotFoundError, ConflictError } from "@poramma/utils";
import { getActorName, getUser, getAgent, getSubServiceShallow } from "../../shared/enrich";
import { demandesLogic, documentsLogic, notificationsLogic, identitySchema, etudiantsSchema } from "@poramma/ambassade-core";
import { writeAudit } from "../audit/audit.service";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

interface Actor {
  userId: string;
  roleName: string | null;
}

/**
 * État d'une demande de complément (statut ADDITIONAL_INFO_REQUIRED) : quand
 * elle a été faite, ce qui a été demandé, et si l'usager y a répondu depuis
 * (message public ou nouveau document). Ce n'est PAS un état final : l'agent
 * décide de reprendre le traitement, avec un avertissement s'il n'y a pas eu
 * de réponse.
 */
async function computeComplement(demandeId: string) {
  const [request] = await db
    .select()
    .from(demandeHistories)
    .where(and(eq(demandeHistories.demandeId, demandeId), eq(demandeHistories.toStatus, "ADDITIONAL_INFO_REQUIRED"), eq(demandeHistories.action, "STATUS_CHANGE")))
    .orderBy(desc(demandeHistories.createdAt))
    .limit(1);
  if (!request?.createdAt) return null;

  const since = request.createdAt;
  const [comments, docs] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int`, last: sql<Date | null>`max(${demandeComments.createdAt})` })
      .from(demandeComments)
      .where(and(eq(demandeComments.demandeId, demandeId), eq(demandeComments.authorType, "STUDENT"), eq(demandeComments.isInternal, false), gt(demandeComments.createdAt, since))),
    db
      .select({ n: sql<number>`count(*)::int`, last: sql<Date | null>`max(${demandeDocuments.createdAt})` })
      .from(demandeDocuments)
      .where(and(eq(demandeDocuments.demandeId, demandeId), gt(demandeDocuments.createdAt, since))),
  ]);

  const lastTimes = [comments[0]?.last, docs[0]?.last].filter((d): d is Date => !!d).map((d) => new Date(d).getTime());
  const respondedAt = lastTimes.length ? new Date(Math.max(...lastTimes)) : null;

  return {
    requestedAt: since,
    requestMessage: request.comment,
    requestedBy: request.actorName,
    responded: respondedAt !== null,
    respondedAt,
    newMessages: comments[0]?.n ?? 0,
    newDocuments: docs[0]?.n ?? 0,
  };
}

async function enrichDemande(row: typeof demandes.$inferSelect) {
  const [user, subService, assignedAgent, complement] = await Promise.all([
    getUser(row.userId),
    getSubServiceShallow(row.subServiceId),
    row.assignedAgentId ? getAgent(row.assignedAgentId) : Promise.resolve(null),
    row.status === "ADDITIONAL_INFO_REQUIRED" ? computeComplement(row.id) : Promise.resolve(null),
  ]);
  return {
    ...row,
    totalAmount: row.totalAmount != null ? Number(row.totalAmount) : null,
    user,
    subService,
    assignedAgent,
    complement,
  };
}

/** GET /demandes — liste avec filtres (mission prompt: status, priority, subServiceId, assignedAgentId, search, isOverdue). */
export async function listDemandes(query: {
  status?: string;
  priority?: string;
  subServiceId?: string;
  /** Restriction serveur (agent non-ADMIN scopé à ses services assignés) — voir demandes.controller.ts. */
  subServiceIds?: string[];
  assignedAgentId?: string;
  dossierNumber?: string;
  search?: string;
  isOverdue?: boolean;
  page?: number;
  limit?: number;
}) {
  const conditions = [];
  if (query.status) conditions.push(eq(demandes.status, query.status));
  if (query.priority) conditions.push(eq(demandes.priority, query.priority));
  if (query.subServiceId) conditions.push(eq(demandes.subServiceId, query.subServiceId));
  else if (query.subServiceIds) conditions.push(inArray(demandes.subServiceId, query.subServiceIds));
  if (query.assignedAgentId) conditions.push(eq(demandes.assignedAgentId, query.assignedAgentId));
  if (query.dossierNumber) conditions.push(ilike(demandes.dossierNumber, `%${query.dossierNumber}%`));
  if (query.isOverdue) {
    conditions.push(and(lt(demandes.deadlineAt, new Date()), ne(demandes.status, "COMPLETED")));
  }

  // Recherche SQL (et non plus sur la seule page chargée) : n° de dossier, nom / prénom, email ou INUE du demandeur.
  if (query.search?.trim()) {
    const s = `%${query.search.trim()}%`;
    const matchingUsers = db
      .select({ id: identitySchema.identityUsers.id })
      .from(identitySchema.identityUsers)
      .leftJoin(identitySchema.identityUserProfiles, eq(identitySchema.identityUserProfiles.userId, identitySchema.identityUsers.id))
      .leftJoin(etudiantsSchema.etudiants, eq(etudiantsSchema.etudiants.userId, identitySchema.identityUsers.id))
      .where(
        or(
          ilike(identitySchema.identityUsers.email, s),
          ilike(identitySchema.identityUserProfiles.firstName, s),
          ilike(identitySchema.identityUserProfiles.lastName, s),
          ilike(sql`concat_ws(' ', ${identitySchema.identityUserProfiles.firstName}, ${identitySchema.identityUserProfiles.lastName})`, s),
          ilike(identitySchema.identityUserProfiles.inue, s),
          ilike(etudiantsSchema.etudiants.inue, s)
        )
      );
    conditions.push(or(ilike(demandes.dossierNumber, s), inArray(demandes.userId, matchingUsers))!);
  }

  const page = query.page ?? 1;
  const limit = query.limit ?? 50;

  const rows = await db
    .select()
    .from(demandes)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(demandes.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return Promise.all(rows.map(enrichDemande));
}

export async function getDemande(id: string) {
  const [row] = await db.select().from(demandes).where(eq(demandes.id, id));
  if (!row) throw new NotFoundError("Demande introuvable");
  return enrichDemande(row);
}

/** POST /demandes — logique déplacée dans @poramma/ambassade-core (partagée avec communaute-api) ; ici le parcours staff : aucune pièce obligatoire exigée (dossier ouvert au guichet). */
export async function createDemande(data: Parameters<typeof demandesLogic.createDemande>[1]) {
  const row = await demandesLogic.createDemande(db, data);
  return enrichDemande(row);
}

/**
 * PATCH /demandes/:id/status — transition de workflow. La permission requise
 * dépend du statut cible (validate/reject/update) — vérifiée par le
 * contrôleur, pas ici.
 */
export async function updateStatus(
  id: string,
  payload: { status: string; comment: string; isVisibleToUser: boolean; assignedAgentId?: string },
  actor: Actor
) {
  const [existing] = await db.select().from(demandes).where(eq(demandes.id, id));
  if (!existing) throw new NotFoundError("Demande introuvable");

  // États finaux : une fois la demande terminée, rejetée, annulée ou archivée, seul l'archivage reste possible.
  // « Complément requis » N'EST PAS final : l'agent peut reprendre le traitement (ou redemander un complément).
  const FINAL = ["COMPLETED", "REJECTED", "CANCELLED", "ARCHIVED"];
  if (FINAL.includes(existing.status) && payload.status !== existing.status && !(payload.status === "ARCHIVED" && existing.status !== "ARCHIVED")) {
    const FINAL_LABEL: Record<string, string> = { COMPLETED: "terminée", REJECTED: "rejetée", CANCELLED: "annulée", ARCHIVED: "archivée" };
    throw new ConflictError(`Cette demande est déjà ${FINAL_LABEL[existing.status] ?? "clôturée"} : son statut ne peut plus être modifié.`);
  }
  if (FINAL.includes(existing.status) && payload.status === existing.status) {
    throw new ConflictError("Cette demande est déjà dans ce statut.");
  }

  const patch: Partial<typeof demandes.$inferInsert> = {
    status: payload.status,
    updatedAt: new Date(),
  };
  if (payload.assignedAgentId) {
    patch.assignedAgentId = payload.assignedAgentId;
    patch.assignedAt = new Date();
  }
  if (payload.status === "COMPLETED") patch.completedAt = new Date();

  const [updated] = await db.update(demandes).set(patch).where(eq(demandes.id, id)).returning();

  await db.insert(demandeHistories).values({
    id: newId("hist"),
    demandeId: id,
    action: "STATUS_CHANGE",
    fromStatus: existing.status,
    toStatus: payload.status,
    actorUserId: actor.userId,
    actorRole: actor.roleName,
    actorName: await getActorName(actor.userId),
    comment: payload.comment,
    isVisibleToUser: payload.isVisibleToUser,
  });

  await writeAudit({
    action: "UPDATE_STATUS",
    entityType: "DEMANDE",
    entityId: id,
    actor,
    entitySnapshot: { fromStatus: existing.status, toStatus: payload.status },
    details: { comment: payload.comment },
  });

  const enriched = await enrichDemande(updated);

  if (existing.status !== payload.status) {
    await notifyRequesterOfStatusChange(enriched, payload.status, payload.isVisibleToUser ? payload.comment : null);
  }

  return enriched;
}

/**
 * Notification in-app systématique ; l'email (statuts importants) est géré par
 * @poramma/ambassade-core. Best-effort : un échec ne bloque jamais le changement de statut.
 */
async function notifyRequesterOfStatusChange(
  demande: Awaited<ReturnType<typeof enrichDemande>>,
  status: string,
  agentComment: string | null
) {
  try {
    await notificationsLogic.notifyDemandeStatusChange(db, {
      userId: demande.userId,
      demandeId: demande.id,
      dossierNumber: demande.dossierNumber,
      serviceName: demande.subService?.name,
      status,
      agentComment,
    });
  } catch (err) {
    console.error("[demandes] notification de changement de statut échouée", err);
  }
}

/** POST /demandes/:id/assign */
export async function assignAgent(id: string, payload: { agentId: string; note?: string }, actor: Actor) {
  const [existing] = await db.select().from(demandes).where(eq(demandes.id, id));
  if (!existing) throw new NotFoundError("Demande introuvable");

  const agent = await getAgent(payload.agentId);
  if (!agent) throw new NotFoundError("Agent introuvable");

  const [updated] = await db
    .update(demandes)
    .set({ assignedAgentId: payload.agentId, assignedAt: new Date(), updatedAt: new Date() })
    .where(eq(demandes.id, id))
    .returning();

  await db.insert(demandeHistories).values({
    id: newId("hist"),
    demandeId: id,
    action: "ASSIGNMENT",
    fromStatus: existing.status,
    toStatus: existing.status,
    actorUserId: actor.userId,
    actorRole: actor.roleName,
    actorName: await getActorName(actor.userId),
    comment: payload.note || `Assignée à ${agent.matricule}`,
    isVisibleToUser: false,
  });

  return enrichDemande(updated);
}

export async function listHistory(demandeId: string) {
  return db.select().from(demandeHistories).where(eq(demandeHistories.demandeId, demandeId)).orderBy(demandeHistories.createdAt);
}

/**
 * Espace d'échange demandeur ↔ agents : les commentaires non internes
 * (isInternal=false) sont l'historique visible du demandeur, distinct des
 * notes internes réservées au personnel. `listComments`/`addComment` sont
 * appelés aussi bien par le staff (tout voir) que par le demandeur
 * lui-même (filtré aux commentaires publics — voir demandes.controller.ts).
 */
export async function listComments(demandeId: string) {
  return db.select().from(demandeComments).where(eq(demandeComments.demandeId, demandeId)).orderBy(demandeComments.createdAt);
}

/** Léger lookup pour vérifier la propriété d'un dossier sans l'enrichir entièrement. */
export async function getDemandeOwnerId(demandeId: string): Promise<string> {
  const [row] = await db.select({ userId: demandes.userId }).from(demandes).where(eq(demandes.id, demandeId));
  if (!row) throw new NotFoundError("Demande introuvable");
  return row.userId;
}

/** Léger lookup combinant propriétaire + sous-service — évite deux requêtes séparées dans le contrôleur. */
export async function getDemandeAccessInfo(demandeId: string): Promise<{ userId: string; subServiceId: string }> {
  const [row] = await db
    .select({ userId: demandes.userId, subServiceId: demandes.subServiceId })
    .from(demandes)
    .where(eq(demandes.id, demandeId));
  if (!row) throw new NotFoundError("Demande introuvable");
  return row;
}

/**
 * POST /demandes/:id/comments — un demandeur qui commente son propre dossier
 * ne peut écrire que dans le canal public (isInternal forcé à false, quoi
 * que le payload demande) ; le staff garde le choix public/interne.
 */
export async function addComment(demandeId: string, content: string, isInternal: boolean, actor: Actor, isStaff: boolean) {
  const [existing] = await db.select().from(demandes).where(eq(demandes.id, demandeId));
  if (!existing) throw new NotFoundError("Demande introuvable");

  const isOwner = existing.userId === actor.userId;

  const [row] = await db
    .insert(demandeComments)
    .values({
      id: newId("com"),
      demandeId,
      authorId: actor.userId,
      authorName: await getActorName(actor.userId),
      authorType: isOwner && !isStaff ? "STUDENT" : "AGENT",
      content,
      isInternal: isStaff ? isInternal ?? true : false,
    })
    .returning();
  return row;
}

/** Pièces jointes au dossier, enrichies comme dans GET /documents/:id (vue staff) — les agents les consultent/téléchargent ensuite via /documents/:id/download. */
export async function listDemandeDocuments(demandeId: string) {
  const links = await demandesLogic.listDemandeDocuments(db, demandeId);
  const docs = await Promise.all(links.map((l) => documentsLogic.getDocument(db, l.documentId)));
  return docs.map((doc, i) => ({ ...doc, demandeRequirementId: links[i].requirementId }));
}

export async function listRequirements(demandeId: string) {
  return db.select().from(demandeRequirements).where(eq(demandeRequirements.demandeId, demandeId));
}

/** PATCH /demandes/requirements/:requirementId */
export async function validateRequirement(requirementId: string, status: string, note: string | undefined, actor: Actor) {
  const [existing] = await db.select().from(demandeRequirements).where(eq(demandeRequirements.id, requirementId));
  if (!existing) throw new NotFoundError("Exigence introuvable");

  const [updated] = await db
    .update(demandeRequirements)
    .set({
      status,
      reviewerNote: note ?? null,
      reviewedBy: actor.userId,
      reviewedAt: new Date(),
    })
    .where(eq(demandeRequirements.id, requirementId))
    .returning();
  return updated;
}
