"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDemandes = listDemandes;
exports.getDemande = getDemande;
exports.createDemande = createDemande;
exports.updateStatus = updateStatus;
exports.assignAgent = assignAgent;
exports.listHistory = listHistory;
exports.listComments = listComments;
exports.getDemandeOwnerId = getDemandeOwnerId;
exports.getDemandeAccessInfo = getDemandeAccessInfo;
exports.addComment = addComment;
exports.listDemandeDocuments = listDemandeDocuments;
exports.listRequirements = listRequirements;
exports.validateRequirement = validateRequirement;
const crypto_1 = __importDefault(require("crypto"));
const connection_1 = require("../../db/connection");
const schema_demandes_1 = require("../../db/schema.demandes");
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const enrich_1 = require("../../shared/enrich");
const ambassade_core_1 = require("@poramma/ambassade-core");
const audit_service_1 = require("../audit/audit.service");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
async function computeComplement(demandeId) {
    const [request] = await connection_1.db
        .select()
        .from(schema_demandes_1.demandeHistories)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_demandes_1.demandeHistories.demandeId, demandeId), (0, drizzle_orm_1.eq)(schema_demandes_1.demandeHistories.toStatus, "ADDITIONAL_INFO_REQUIRED"), (0, drizzle_orm_1.eq)(schema_demandes_1.demandeHistories.action, "STATUS_CHANGE")))
        .orderBy((0, drizzle_orm_1.desc)(schema_demandes_1.demandeHistories.createdAt))
        .limit(1);
    if (!request?.createdAt)
        return null;
    const since = request.createdAt;
    const [comments, docs] = await Promise.all([
        connection_1.db
            .select({ n: (0, drizzle_orm_1.sql) `count(*)::int`, last: (0, drizzle_orm_1.sql) `max(${schema_demandes_1.demandeComments.createdAt})` })
            .from(schema_demandes_1.demandeComments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_demandes_1.demandeComments.demandeId, demandeId), (0, drizzle_orm_1.eq)(schema_demandes_1.demandeComments.authorType, "STUDENT"), (0, drizzle_orm_1.eq)(schema_demandes_1.demandeComments.isInternal, false), (0, drizzle_orm_1.gt)(schema_demandes_1.demandeComments.createdAt, since))),
        connection_1.db
            .select({ n: (0, drizzle_orm_1.sql) `count(*)::int`, last: (0, drizzle_orm_1.sql) `max(${schema_demandes_1.demandeDocuments.createdAt})` })
            .from(schema_demandes_1.demandeDocuments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_demandes_1.demandeDocuments.demandeId, demandeId), (0, drizzle_orm_1.gt)(schema_demandes_1.demandeDocuments.createdAt, since))),
    ]);
    const lastTimes = [comments[0]?.last, docs[0]?.last].filter((d) => !!d).map((d) => new Date(d).getTime());
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
async function enrichDemande(row) {
    const [user, subService, assignedAgent, complement] = await Promise.all([
        (0, enrich_1.getUser)(row.userId),
        (0, enrich_1.getSubServiceShallow)(row.subServiceId),
        row.assignedAgentId ? (0, enrich_1.getAgent)(row.assignedAgentId) : Promise.resolve(null),
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
async function listDemandes(query) {
    const conditions = [];
    if (query.status)
        conditions.push((0, drizzle_orm_1.eq)(schema_demandes_1.demandes.status, query.status));
    if (query.priority)
        conditions.push((0, drizzle_orm_1.eq)(schema_demandes_1.demandes.priority, query.priority));
    if (query.subServiceId)
        conditions.push((0, drizzle_orm_1.eq)(schema_demandes_1.demandes.subServiceId, query.subServiceId));
    else if (query.subServiceIds)
        conditions.push((0, drizzle_orm_1.inArray)(schema_demandes_1.demandes.subServiceId, query.subServiceIds));
    if (query.assignedAgentId)
        conditions.push((0, drizzle_orm_1.eq)(schema_demandes_1.demandes.assignedAgentId, query.assignedAgentId));
    if (query.dossierNumber)
        conditions.push((0, drizzle_orm_1.ilike)(schema_demandes_1.demandes.dossierNumber, `%${query.dossierNumber}%`));
    if (query.isOverdue) {
        conditions.push((0, drizzle_orm_1.and)((0, drizzle_orm_1.lt)(schema_demandes_1.demandes.deadlineAt, new Date()), (0, drizzle_orm_1.ne)(schema_demandes_1.demandes.status, "COMPLETED")));
    }
    if (query.search?.trim()) {
        const s = `%${query.search.trim()}%`;
        const matchingUsers = connection_1.db
            .select({ id: ambassade_core_1.identitySchema.identityUsers.id })
            .from(ambassade_core_1.identitySchema.identityUsers)
            .leftJoin(ambassade_core_1.identitySchema.identityUserProfiles, (0, drizzle_orm_1.eq)(ambassade_core_1.identitySchema.identityUserProfiles.userId, ambassade_core_1.identitySchema.identityUsers.id))
            .leftJoin(ambassade_core_1.etudiantsSchema.etudiants, (0, drizzle_orm_1.eq)(ambassade_core_1.etudiantsSchema.etudiants.userId, ambassade_core_1.identitySchema.identityUsers.id))
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(ambassade_core_1.identitySchema.identityUsers.email, s), (0, drizzle_orm_1.ilike)(ambassade_core_1.identitySchema.identityUserProfiles.firstName, s), (0, drizzle_orm_1.ilike)(ambassade_core_1.identitySchema.identityUserProfiles.lastName, s), (0, drizzle_orm_1.ilike)((0, drizzle_orm_1.sql) `concat_ws(' ', ${ambassade_core_1.identitySchema.identityUserProfiles.firstName}, ${ambassade_core_1.identitySchema.identityUserProfiles.lastName})`, s), (0, drizzle_orm_1.ilike)(ambassade_core_1.identitySchema.identityUserProfiles.inue, s), (0, drizzle_orm_1.ilike)(ambassade_core_1.etudiantsSchema.etudiants.inue, s)));
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_demandes_1.demandes.dossierNumber, s), (0, drizzle_orm_1.inArray)(schema_demandes_1.demandes.userId, matchingUsers)));
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const rows = await connection_1.db
        .select()
        .from(schema_demandes_1.demandes)
        .where(conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined)
        .orderBy((0, drizzle_orm_1.desc)(schema_demandes_1.demandes.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);
    return Promise.all(rows.map(enrichDemande));
}
async function getDemande(id) {
    const [row] = await connection_1.db.select().from(schema_demandes_1.demandes).where((0, drizzle_orm_1.eq)(schema_demandes_1.demandes.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Demande introuvable");
    return enrichDemande(row);
}
async function createDemande(data) {
    const row = await ambassade_core_1.demandesLogic.createDemande(connection_1.db, data);
    return enrichDemande(row);
}
async function updateStatus(id, payload, actor) {
    const [existing] = await connection_1.db.select().from(schema_demandes_1.demandes).where((0, drizzle_orm_1.eq)(schema_demandes_1.demandes.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Demande introuvable");
    const FINAL = ["COMPLETED", "REJECTED", "CANCELLED", "ARCHIVED"];
    if (FINAL.includes(existing.status) && payload.status !== existing.status && !(payload.status === "ARCHIVED" && existing.status !== "ARCHIVED")) {
        const FINAL_LABEL = { COMPLETED: "terminée", REJECTED: "rejetée", CANCELLED: "annulée", ARCHIVED: "archivée" };
        throw new utils_1.ConflictError(`Cette demande est déjà ${FINAL_LABEL[existing.status] ?? "clôturée"} : son statut ne peut plus être modifié.`);
    }
    if (FINAL.includes(existing.status) && payload.status === existing.status) {
        throw new utils_1.ConflictError("Cette demande est déjà dans ce statut.");
    }
    const patch = {
        status: payload.status,
        updatedAt: new Date(),
    };
    if (payload.assignedAgentId) {
        patch.assignedAgentId = payload.assignedAgentId;
        patch.assignedAt = new Date();
    }
    if (payload.status === "COMPLETED")
        patch.completedAt = new Date();
    const [updated] = await connection_1.db.update(schema_demandes_1.demandes).set(patch).where((0, drizzle_orm_1.eq)(schema_demandes_1.demandes.id, id)).returning();
    await connection_1.db.insert(schema_demandes_1.demandeHistories).values({
        id: newId("hist"),
        demandeId: id,
        action: "STATUS_CHANGE",
        fromStatus: existing.status,
        toStatus: payload.status,
        actorUserId: actor.userId,
        actorRole: actor.roleName,
        actorName: await (0, enrich_1.getActorName)(actor.userId),
        comment: payload.comment,
        isVisibleToUser: payload.isVisibleToUser,
    });
    await (0, audit_service_1.writeAudit)({
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
async function notifyRequesterOfStatusChange(demande, status, agentComment) {
    try {
        await ambassade_core_1.notificationsLogic.notifyDemandeStatusChange(connection_1.db, {
            userId: demande.userId,
            demandeId: demande.id,
            dossierNumber: demande.dossierNumber,
            serviceName: demande.subService?.name,
            status,
            agentComment,
        });
    }
    catch (err) {
        console.error("[demandes] notification de changement de statut échouée", err);
    }
}
async function assignAgent(id, payload, actor) {
    const [existing] = await connection_1.db.select().from(schema_demandes_1.demandes).where((0, drizzle_orm_1.eq)(schema_demandes_1.demandes.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Demande introuvable");
    const agent = await (0, enrich_1.getAgent)(payload.agentId);
    if (!agent)
        throw new utils_1.NotFoundError("Agent introuvable");
    const [updated] = await connection_1.db
        .update(schema_demandes_1.demandes)
        .set({ assignedAgentId: payload.agentId, assignedAt: new Date(), updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_demandes_1.demandes.id, id))
        .returning();
    await connection_1.db.insert(schema_demandes_1.demandeHistories).values({
        id: newId("hist"),
        demandeId: id,
        action: "ASSIGNMENT",
        fromStatus: existing.status,
        toStatus: existing.status,
        actorUserId: actor.userId,
        actorRole: actor.roleName,
        actorName: await (0, enrich_1.getActorName)(actor.userId),
        comment: payload.note || `Assignée à ${agent.matricule}`,
        isVisibleToUser: false,
    });
    return enrichDemande(updated);
}
async function listHistory(demandeId) {
    return connection_1.db.select().from(schema_demandes_1.demandeHistories).where((0, drizzle_orm_1.eq)(schema_demandes_1.demandeHistories.demandeId, demandeId)).orderBy(schema_demandes_1.demandeHistories.createdAt);
}
async function listComments(demandeId) {
    return connection_1.db.select().from(schema_demandes_1.demandeComments).where((0, drizzle_orm_1.eq)(schema_demandes_1.demandeComments.demandeId, demandeId)).orderBy(schema_demandes_1.demandeComments.createdAt);
}
async function getDemandeOwnerId(demandeId) {
    const [row] = await connection_1.db.select({ userId: schema_demandes_1.demandes.userId }).from(schema_demandes_1.demandes).where((0, drizzle_orm_1.eq)(schema_demandes_1.demandes.id, demandeId));
    if (!row)
        throw new utils_1.NotFoundError("Demande introuvable");
    return row.userId;
}
async function getDemandeAccessInfo(demandeId) {
    const [row] = await connection_1.db
        .select({ userId: schema_demandes_1.demandes.userId, subServiceId: schema_demandes_1.demandes.subServiceId })
        .from(schema_demandes_1.demandes)
        .where((0, drizzle_orm_1.eq)(schema_demandes_1.demandes.id, demandeId));
    if (!row)
        throw new utils_1.NotFoundError("Demande introuvable");
    return row;
}
async function addComment(demandeId, content, isInternal, actor, isStaff) {
    const [existing] = await connection_1.db.select().from(schema_demandes_1.demandes).where((0, drizzle_orm_1.eq)(schema_demandes_1.demandes.id, demandeId));
    if (!existing)
        throw new utils_1.NotFoundError("Demande introuvable");
    const isOwner = existing.userId === actor.userId;
    const [row] = await connection_1.db
        .insert(schema_demandes_1.demandeComments)
        .values({
        id: newId("com"),
        demandeId,
        authorId: actor.userId,
        authorName: await (0, enrich_1.getActorName)(actor.userId),
        authorType: isOwner && !isStaff ? "STUDENT" : "AGENT",
        content,
        isInternal: isStaff ? isInternal ?? true : false,
    })
        .returning();
    return row;
}
async function listDemandeDocuments(demandeId) {
    const links = await ambassade_core_1.demandesLogic.listDemandeDocuments(connection_1.db, demandeId);
    const docs = await Promise.all(links.map((l) => ambassade_core_1.documentsLogic.getDocument(connection_1.db, l.documentId)));
    return docs.map((doc, i) => ({ ...doc, demandeRequirementId: links[i].requirementId }));
}
async function listRequirements(demandeId) {
    return connection_1.db.select().from(schema_demandes_1.demandeRequirements).where((0, drizzle_orm_1.eq)(schema_demandes_1.demandeRequirements.demandeId, demandeId));
}
async function validateRequirement(requirementId, status, note, actor) {
    const [existing] = await connection_1.db.select().from(schema_demandes_1.demandeRequirements).where((0, drizzle_orm_1.eq)(schema_demandes_1.demandeRequirements.id, requirementId));
    if (!existing)
        throw new utils_1.NotFoundError("Exigence introuvable");
    const [updated] = await connection_1.db
        .update(schema_demandes_1.demandeRequirements)
        .set({
        status,
        reviewerNote: note ?? null,
        reviewedBy: actor.userId,
        reviewedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_demandes_1.demandeRequirements.id, requirementId))
        .returning();
    return updated;
}
//# sourceMappingURL=demandes.service.js.map