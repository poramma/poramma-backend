"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDemande = createDemande;
exports.getDemandeRow = getDemandeRow;
exports.listDemandesByUser = listDemandesByUser;
exports.getOwnedDemande = getOwnedDemande;
exports.listHistory = listHistory;
exports.listComments = listComments;
exports.recordComplementProvided = recordComplementProvided;
exports.addComment = addComment;
exports.listRequirements = listRequirements;
exports.listDemandeDocuments = listDemandeDocuments;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const services_1 = require("../schema/services");
const demandes_1 = require("../schema/demandes");
const documents_1 = require("../schema/documents");
const rendezvous_1 = require("../schema/rendezvous");
const services_2 = require("./services");
const identity_1 = require("./identity");
const audit_1 = require("./audit");
const culture_1 = require("./culture");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
async function nextDossierNumber(db) {
    const year = new Date().getFullYear();
    const [{ count }] = await db
        .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
        .from(demandes_1.demandes)
        .where((0, drizzle_orm_1.ilike)(demandes_1.demandes.dossierNumber, `DEM-${year}-%`));
    const seq = String(count + 1).padStart(7, "0");
    return `DEM-${year}-${seq}`;
}
async function createDemande(db, data) {
    const sub = await (0, services_2.getSubServiceShallow)(db, data.subServiceId);
    if (!sub)
        throw new utils_1.NotFoundError("Sous-service introuvable");
    if (sub.active === false)
        throw new utils_1.ValidationError("Ce service n'est pas disponible actuellement.", { subServiceId: ["inactive"] });
    const subRequirements = await db
        .select()
        .from(services_1.requirements)
        .where((0, drizzle_orm_1.eq)(services_1.requirements.subServiceId, data.subServiceId))
        .orderBy((0, drizzle_orm_1.asc)(services_1.requirements.order));
    const attachments = data.documents ?? [];
    if (attachments.length) {
        const ids = attachments.map((a) => a.documentId);
        const owned = await db
            .select({ id: documents_1.documents.id, ownerUserId: documents_1.documents.ownerUserId })
            .from(documents_1.documents)
            .where((0, drizzle_orm_1.inArray)(documents_1.documents.id, ids));
        const ownedIds = new Set(owned.filter((d) => d.ownerUserId === data.userId).map((d) => d.id));
        if (ids.some((id) => !ownedIds.has(id))) {
            throw new utils_1.ForbiddenError("Une des pièces jointes n'existe pas ou ne vous appartient pas.");
        }
        for (const a of attachments) {
            if (a.requirementId && !subRequirements.some((r) => r.id === a.requirementId)) {
                throw new utils_1.ValidationError("Prérequis inconnu pour ce service.", { documents: [`requirementId ${a.requirementId}`] });
            }
        }
    }
    if (data.enforceRequiredDocuments) {
        const providedRequirementIds = new Set(attachments.map((a) => a.requirementId).filter(Boolean));
        const missing = subRequirements
            .filter((r) => r.required && (r.type === "DOCUMENT" || r.type === "PHOTO") && !providedRequirementIds.has(r.id))
            .map((r) => r.label);
        if (missing.length) {
            throw new utils_1.ValidationError("Des pièces obligatoires sont manquantes.", { documents: missing });
        }
    }
    const dossierNumber = await nextDossierNumber(db);
    const now = new Date();
    const deadlineAt = new Date(now.getTime() + sub.slaDays * 24 * 60 * 60 * 1000);
    const actorName = await (0, identity_1.getActorName)(db, data.userId);
    const cultural = sub.service?.isCultural === true;
    let culturalAgentId = null;
    if (cultural) {
        const [assignment] = await db
            .select({ agentId: rendezvous_1.agentServiceAssignments.agentId })
            .from(rendezvous_1.agentServiceAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(rendezvous_1.agentServiceAssignments.subServiceId, data.subServiceId), (0, drizzle_orm_1.eq)(rendezvous_1.agentServiceAssignments.active, true)))
            .orderBy((0, drizzle_orm_1.desc)(rendezvous_1.agentServiceAssignments.isPrimary))
            .limit(1);
        culturalAgentId = assignment?.agentId ?? null;
    }
    const created = await db.transaction(async (tx) => {
        const conn = tx;
        const [row] = await conn
            .insert(demandes_1.demandes)
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
                .insert(demandes_1.demandeRequirements)
                .values(subRequirements.map((r) => ({
                id: newId("dreq"),
                demandeId: row.id,
                requirementId: r.id,
                label: r.label,
                type: r.type,
                status: "PENDING",
            })))
                .returning()
            : [];
        for (const a of attachments) {
            const target = a.requirementId ? seeded.find((s) => s.requirementId === a.requirementId) : undefined;
            await conn.insert(demandes_1.demandeDocuments).values({
                id: newId("ddoc"),
                demandeId: row.id,
                documentId: a.documentId,
                requirementId: target?.id ?? null,
                isPrimary: !!target,
            });
            if (target) {
                await conn
                    .update(demandes_1.demandeRequirements)
                    .set({ status: "PROVIDED", providedDocumentId: a.documentId })
                    .where((0, drizzle_orm_1.eq)(demandes_1.demandeRequirements.id, target.id));
            }
        }
        await conn.insert(demandes_1.demandeHistories).values({
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
        await (0, audit_1.writeAudit)(conn, {
            action: "CREATE",
            entityType: "DEMANDE",
            entityId: row.id,
            actor: { userId: data.userId, roleName: "STUDENT" },
            entitySnapshot: { subServiceId: data.subServiceId, dossierNumber, documents: attachments.length },
        });
        return row;
    });
    if (cultural) {
        await (0, culture_1.notifyCultureStaff)(db, {
            title: `Nouvelle demande culturelle — ${sub.name}`,
            body: `${actorName} a déposé la demande ${dossierNumber} (${sub.name}).`,
            payload: { demandeId: created.id, dossierNumber },
            actionUrl: `/demandes/${created.id}`,
        });
    }
    return created;
}
async function getDemandeRow(db, id) {
    const [row] = await db.select().from(demandes_1.demandes).where((0, drizzle_orm_1.eq)(demandes_1.demandes.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Demande introuvable");
    return row;
}
async function listDemandesByUser(db, userId) {
    return db.select().from(demandes_1.demandes).where((0, drizzle_orm_1.eq)(demandes_1.demandes.userId, userId)).orderBy((0, drizzle_orm_1.desc)(demandes_1.demandes.createdAt));
}
async function getOwnedDemande(db, id, userId) {
    const row = await getDemandeRow(db, id);
    if (row.userId !== userId)
        throw new utils_1.ForbiddenError("Accès non autorisé à cette demande");
    return row;
}
async function listHistory(db, demandeId) {
    return db.select().from(demandes_1.demandeHistories).where((0, drizzle_orm_1.eq)(demandes_1.demandeHistories.demandeId, demandeId)).orderBy(demandes_1.demandeHistories.createdAt);
}
async function listComments(db, demandeId) {
    return db.select().from(demandes_1.demandeComments).where((0, drizzle_orm_1.eq)(demandes_1.demandeComments.demandeId, demandeId)).orderBy(demandes_1.demandeComments.createdAt);
}
async function recordComplementProvided(db, demandeId, actor, kind) {
    const [d] = await db.select({ status: demandes_1.demandes.status, userId: demandes_1.demandes.userId }).from(demandes_1.demandes).where((0, drizzle_orm_1.eq)(demandes_1.demandes.id, demandeId));
    if (!d || d.status !== "ADDITIONAL_INFO_REQUIRED" || d.userId !== actor.userId)
        return;
    await db.insert(demandes_1.demandeHistories).values({
        id: newId("hist"),
        demandeId,
        action: "INFO_PROVIDED",
        fromStatus: d.status,
        toStatus: d.status,
        actorUserId: actor.userId,
        actorRole: null,
        actorName: await (0, identity_1.getActorName)(db, actor.userId),
        comment: kind === "document" ? "Le demandeur a ajouté un document au dossier." : "Le demandeur a répondu par un message.",
        isVisibleToUser: true,
    });
}
async function addComment(db, demandeId, content, isInternal, actor, isStaff) {
    const existing = await getDemandeRow(db, demandeId);
    const isOwner = existing.userId === actor.userId;
    const [row] = await db
        .insert(demandes_1.demandeComments)
        .values({
        id: newId("com"),
        demandeId,
        authorId: actor.userId,
        authorName: await (0, identity_1.getActorName)(db, actor.userId),
        authorType: isOwner && !isStaff ? "STUDENT" : "AGENT",
        content,
        isInternal: isStaff ? isInternal ?? true : false,
    })
        .returning();
    await (0, audit_1.writeAudit)(db, {
        action: "COMMENT",
        entityType: "DEMANDE",
        entityId: demandeId,
        actor,
        details: { internal: isStaff ? isInternal : false },
    });
    if (isOwner && !isStaff)
        await recordComplementProvided(db, demandeId, actor, "message");
    return row;
}
async function listRequirements(db, demandeId) {
    return db.select().from(demandes_1.demandeRequirements).where((0, drizzle_orm_1.eq)(demandes_1.demandeRequirements.demandeId, demandeId));
}
async function listDemandeDocuments(db, demandeId) {
    return db
        .select({
        linkId: demandes_1.demandeDocuments.id,
        requirementId: demandes_1.demandeDocuments.requirementId,
        documentId: documents_1.documents.id,
        type: documents_1.documents.type,
        status: documents_1.documents.status,
        reviewNote: documents_1.documents.reviewNote,
        createdAt: documents_1.documents.createdAt,
        originalName: documents_1.storedFiles.originalName,
        mimeType: documents_1.storedFiles.mimeType,
        size: documents_1.storedFiles.size,
    })
        .from(demandes_1.demandeDocuments)
        .innerJoin(documents_1.documents, (0, drizzle_orm_1.eq)(documents_1.documents.id, demandes_1.demandeDocuments.documentId))
        .innerJoin(documents_1.storedFiles, (0, drizzle_orm_1.eq)(documents_1.storedFiles.id, documents_1.documents.fileId))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(demandes_1.demandeDocuments.demandeId, demandeId)));
}
//# sourceMappingURL=demandes.js.map