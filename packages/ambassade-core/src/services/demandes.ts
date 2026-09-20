import crypto from "crypto";
import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { ForbiddenError, NotFoundError, ValidationError } from "@poramma/utils";
import type { Db } from "../db-type";
import { requirements } from "../schema/services";
import {
  demandes,
  demandeRequirements,
  demandeHistories,
  demandeComments,
  demandeDocuments,
} from "../schema/demandes";
import { documents, storedFiles } from "../schema/documents";
import { agentServiceAssignments } from "../schema/rendezvous";
import { getSubServiceShallow } from "./services";
import { getActorName } from "./identity";
import { writeAudit } from "./audit";
import { notifyCultureStaff } from "./culture";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

interface Actor {
  userId: string;
  roleName: string | null;
}

async function nextDossierNumber(db: Db): Promise<string> {
  const year = new Date().getFullYear();
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(demandes)
    .where(ilike(demandes.dossierNumber, `DEM-${year}-%`));
  const seq = String(count + 1).padStart(7, "0");
  return `DEM-${year}-${seq}`;
}

export interface CreateDemandeInput {
  userId: string;
  subServiceId: string;
  priority?: string;
  totalAmount?: number | null;
  currency?: string | null;
  customPayload?: Record<string, unknown> | null;
  /**
   * Pièces déjà téléversées par le demandeur, à joindre au dossier.
   * `requirementId` = id du prérequis du catalogue (requirements.id), pas
   * celui de la ligne de suivi seedée par cette fonction.
   */
  documents?: { requirementId?: string | null; documentId: string }[];
  /** Refuse la création si un prérequis DOCUMENT/PHOTO obligatoire n'a pas de pièce (parcours citoyen). */
  enforceRequiredDocuments?: boolean;
}

/**
 * Crée le dossier, seede ses `demande_requirements` depuis le sous-service,
 * joint les pièces fournies et écrit historique + audit — le tout dans UNE
 * transaction, pour qu'un dossier ne puisse jamais exister sans ses pièces
 * (ou l'inverse) en cas d'échec partiel.
 */
export async function createDemande(db: Db, data: CreateDemandeInput) {
  const sub = await getSubServiceShallow(db, data.subServiceId);
  if (!sub) throw new NotFoundError("Sous-service introuvable");
  if (sub.active === false) throw new ValidationError("Ce service n'est pas disponible actuellement.", { subServiceId: ["inactive"] });

  const subRequirements = await db
    .select()
    .from(requirements)
    .where(eq(requirements.subServiceId, data.subServiceId))
    .orderBy(asc(requirements.order));

  // Chaque pièce jointe doit appartenir au demandeur — sinon on pourrait
  // rattacher à son dossier le document d'un tiers.
  const attachments = data.documents ?? [];
  if (attachments.length) {
    const ids = attachments.map((a) => a.documentId);
    const owned = await db
      .select({ id: documents.id, ownerUserId: documents.ownerUserId })
      .from(documents)
      .where(inArray(documents.id, ids));
    const ownedIds = new Set(owned.filter((d) => d.ownerUserId === data.userId).map((d) => d.id));
    if (ids.some((id) => !ownedIds.has(id))) {
      throw new ForbiddenError("Une des pièces jointes n'existe pas ou ne vous appartient pas.");
    }
    for (const a of attachments) {
      if (a.requirementId && !subRequirements.some((r) => r.id === a.requirementId)) {
        throw new ValidationError("Prérequis inconnu pour ce service.", { documents: [`requirementId ${a.requirementId}`] });
      }
    }
  }

  if (data.enforceRequiredDocuments) {
    const providedRequirementIds = new Set(attachments.map((a) => a.requirementId).filter(Boolean));
    const missing = subRequirements
      .filter((r) => r.required && (r.type === "DOCUMENT" || r.type === "PHOTO") && !providedRequirementIds.has(r.id))
      .map((r) => r.label);
    if (missing.length) {
      throw new ValidationError("Des pièces obligatoires sont manquantes.", { documents: missing });
    }
  }

  const dossierNumber = await nextDossierNumber(db);
  const now = new Date();
  const deadlineAt = new Date(now.getTime() + sub.slaDays * 24 * 60 * 60 * 1000);
  const actorName = await getActorName(db, data.userId);

  // Espace culturel : la demande revient directement au Conseiller Culturel affecté à cette prestation.
  const cultural = sub.service?.isCultural === true;
  let culturalAgentId: string | null = null;
  if (cultural) {
    const [assignment] = await db
      .select({ agentId: agentServiceAssignments.agentId })
      .from(agentServiceAssignments)
      .where(and(eq(agentServiceAssignments.subServiceId, data.subServiceId), eq(agentServiceAssignments.active, true)))
      .orderBy(desc(agentServiceAssignments.isPrimary))
      .limit(1);
    culturalAgentId = assignment?.agentId ?? null;
  }

  const created = await db.transaction(async (tx) => {
    const conn = tx as unknown as Db;

    const [row] = await conn
      .insert(demandes)
      .values({
        id: newId("dem"),
        userId: data.userId,
        subServiceId: data.subServiceId,
        assignedAgentId: culturalAgentId,
        assignedAt: culturalAgentId ? now : null,
        dossierNumber,
        status: "SUBMITTED",
        priority: data.priority ?? "NORMAL",
        totalAmount: data.totalAmount != null ? String(data.totalAmount) : sub.basePrice != null ? String(sub.basePrice) : null,
        currency: data.currency ?? sub.currency,
        customPayload: data.customPayload ?? null,
        submittedAt: now,
        deadlineAt,
      })
      .returning();

    const seeded = subRequirements.length
      ? await conn
          .insert(demandeRequirements)
          .values(
            subRequirements.map((r) => ({
              id: newId("dreq"),
              demandeId: row.id,
              requirementId: r.id,
              label: r.label,
              type: r.type,
              status: "PENDING" as const,
            }))
          )
          .returning()
      : [];

    for (const a of attachments) {
      const target = a.requirementId ? seeded.find((s) => s.requirementId === a.requirementId) : undefined;
      await conn.insert(demandeDocuments).values({
        id: newId("ddoc"),
        demandeId: row.id,
        documentId: a.documentId,
        requirementId: target?.id ?? null,
        isPrimary: !!target,
      });
      if (target) {
        await conn
          .update(demandeRequirements)
          .set({ status: "PROVIDED", providedDocumentId: a.documentId })
          .where(eq(demandeRequirements.id, target.id));
      }
    }

    await conn.insert(demandeHistories).values({
      id: newId("hist"),
      demandeId: row.id,
      action: "STATUS_CHANGE",
      fromStatus: "DRAFT",
      toStatus: "SUBMITTED",
      actorUserId: data.userId,
      actorRole: "STUDENT",
      actorName,
      comment: "Soumission de la demande",
      isVisibleToUser: true,
    });

    await writeAudit(conn, {
      action: "CREATE",
      entityType: "DEMANDE",
      entityId: row.id,
      actor: { userId: data.userId, roleName: "STUDENT" },
      entitySnapshot: { subServiceId: data.subServiceId, dossierNumber, documents: attachments.length },
    });

    return row;
  });

  if (cultural) {
    await notifyCultureStaff(db, {
      title: `Nouvelle demande culturelle — ${sub.name}`,
      body: `${actorName} a déposé la demande ${dossierNumber} (${sub.name}).`,
      payload: { demandeId: created.id, dossierNumber },
      actionUrl: `/demandes/${created.id}`,
    });
  }
  return created;
}

export async function getDemandeRow(db: Db, id: string) {
  const [row] = await db.select().from(demandes).where(eq(demandes.id, id));
  if (!row) throw new NotFoundError("Demande introuvable");
  return row;
}

export async function listDemandesByUser(db: Db, userId: string) {
  return db.select().from(demandes).where(eq(demandes.userId, userId)).orderBy(desc(demandes.createdAt));
}

/** Lève 404 si absente, 403 si elle n'appartient pas à `userId`. */
export async function getOwnedDemande(db: Db, id: string, userId: string) {
  const row = await getDemandeRow(db, id);
  if (row.userId !== userId) throw new ForbiddenError("Accès non autorisé à cette demande");
  return row;
}

export async function listHistory(db: Db, demandeId: string) {
  return db.select().from(demandeHistories).where(eq(demandeHistories.demandeId, demandeId)).orderBy(demandeHistories.createdAt);
}

export async function listComments(db: Db, demandeId: string) {
  return db.select().from(demandeComments).where(eq(demandeComments.demandeId, demandeId)).orderBy(demandeComments.createdAt);
}

/**
 * Un demandeur qui commente son propre dossier ne peut écrire que dans le
 * canal public (isInternal forcé à false) ; le staff garde le choix.
 */
/**
 * Quand un dossier attend un complément (ADDITIONAL_INFO_REQUIRED) et que son
 * propriétaire répond (message ou pièce), on le consigne dans le suivi pour que
 * l'agent le voie. Le statut, lui, ne change JAMAIS automatiquement : la
 * décision de reprendre le traitement appartient à l'agent.
 */
export async function recordComplementProvided(db: Db, demandeId: string, actor: Actor, kind: "message" | "document") {
  const [d] = await db.select({ status: demandes.status, userId: demandes.userId }).from(demandes).where(eq(demandes.id, demandeId));
  if (!d || d.status !== "ADDITIONAL_INFO_REQUIRED" || d.userId !== actor.userId) return;

  await db.insert(demandeHistories).values({
    id: newId("hist"),
    demandeId,
    action: "INFO_PROVIDED",
    fromStatus: d.status,
    toStatus: d.status,
    actorUserId: actor.userId,
    actorRole: null,
    actorName: await getActorName(db, actor.userId),
    comment: kind === "document" ? "Le demandeur a ajouté un document au dossier." : "Le demandeur a répondu par un message.",
    isVisibleToUser: true,
  });
}

export async function addComment(db: Db, demandeId: string, content: string, isInternal: boolean, actor: Actor, isStaff: boolean) {
  const existing = await getDemandeRow(db, demandeId);
  const isOwner = existing.userId === actor.userId;

  const [row] = await db
    .insert(demandeComments)
    .values({
      id: newId("com"),
      demandeId,
      authorId: actor.userId,
      authorName: await getActorName(db, actor.userId),
      authorType: isOwner && !isStaff ? "STUDENT" : "AGENT",
      content,
      isInternal: isStaff ? isInternal ?? true : false,
    })
    .returning();

  await writeAudit(db, {
    action: "COMMENT",
    entityType: "DEMANDE",
    entityId: demandeId,
    actor,
    details: { internal: isStaff ? isInternal : false },
  });

  if (isOwner && !isStaff) await recordComplementProvided(db, demandeId, actor, "message");

  return row;
}

export async function listRequirements(db: Db, demandeId: string) {
  return db.select().from(demandeRequirements).where(eq(demandeRequirements.demandeId, demandeId));
}

/** Pièces jointes à un dossier, avec le strict nécessaire du fichier (jamais le chemin de stockage ni le checksum). */
export async function listDemandeDocuments(db: Db, demandeId: string) {
  return db
    .select({
      linkId: demandeDocuments.id,
      requirementId: demandeDocuments.requirementId,
      documentId: documents.id,
      type: documents.type,
      status: documents.status,
      reviewNote: documents.reviewNote,
      createdAt: documents.createdAt,
      originalName: storedFiles.originalName,
      mimeType: storedFiles.mimeType,
      size: storedFiles.size,
    })
    .from(demandeDocuments)
    .innerJoin(documents, eq(documents.id, demandeDocuments.documentId))
    .innerJoin(storedFiles, eq(storedFiles.id, documents.fileId))
    .where(and(eq(demandeDocuments.demandeId, demandeId)));
}
