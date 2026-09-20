"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRequest = createRequest;
exports.listMine = listMine;
exports.listAll = listAll;
exports.getOwnerId = getOwnerId;
exports.getRequest = getRequest;
exports.processRequest = processRequest;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../db/connection");
const schema_agent_requests_1 = require("../../db/schema.agent-requests");
const schema_identity_roles_readonly_1 = require("../../db/schema.identity-roles-readonly");
const schema_rendezvous_1 = require("../../db/schema.rendezvous");
const schema_ambassade_1 = require("../../db/schema.ambassade");
const ambassade_core_1 = require("@poramma/ambassade-core");
const utils_1 = require("@poramma/utils");
const dto_1 = require("@poramma/dto");
const enrich_1 = require("../../shared/enrich");
const audit_service_1 = require("../audit/audit.service");
const { identityUsers, identityUserProfiles } = ambassade_core_1.identitySchema;
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
const OPEN_STATUSES = ["PENDING", "IN_PROGRESS"];
const FINAL_STATUSES = ["APPROVED", "REJECTED", "RESOLVED"];
const MAX_OPEN_PER_AGENT = 5;
const KIND_LABEL = { ACCESS_REQUEST: "Demande d'accès", REPORT: "Signalement" };
const STATUS_LABEL = { IN_PROGRESS: "prise en charge", APPROVED: "acceptée", REJECTED: "refusée", RESOLVED: "résolue" };
async function enrich(rows) {
    const users = await ambassade_core_1.identityLogic.getUsersByIds(connection_1.db, rows.flatMap((r) => [r.requesterUserId, r.handledBy].filter((x) => !!x)));
    const subIds = [...new Set(rows.map((r) => r.targetSubServiceId).filter((x) => !!x))];
    const subs = subIds.length ? await connection_1.db.select({ id: schema_ambassade_1.subServices.id, name: schema_ambassade_1.subServices.name }).from(schema_ambassade_1.subServices).where((0, drizzle_orm_1.inArray)(schema_ambassade_1.subServices.id, subIds)) : [];
    const nameOf = (id) => {
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
async function adminUserIds() {
    const rows = await connection_1.db
        .selectDistinct({ userId: schema_identity_roles_readonly_1.identityUserRoles.userId })
        .from(schema_identity_roles_readonly_1.identityUserRoles)
        .innerJoin(schema_identity_roles_readonly_1.identityRoles, (0, drizzle_orm_1.eq)(schema_identity_roles_readonly_1.identityRoles.id, schema_identity_roles_readonly_1.identityUserRoles.roleId))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_roles_readonly_1.identityRoles.name, "ADMIN"), (0, drizzle_orm_1.eq)(schema_identity_roles_readonly_1.identityUserRoles.isActive, true)));
    return rows.map((r) => r.userId);
}
async function createRequest(actor, data) {
    const [{ open }] = await connection_1.db
        .select({ open: (0, drizzle_orm_1.sql) `count(*)::int` })
        .from(schema_agent_requests_1.agentRequests)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_agent_requests_1.agentRequests.requesterUserId, actor.userId), (0, drizzle_orm_1.inArray)(schema_agent_requests_1.agentRequests.status, OPEN_STATUSES)));
    if (open >= MAX_OPEN_PER_AGENT) {
        throw new utils_1.ValidationError(`Vous avez déjà ${MAX_OPEN_PER_AGENT} demandes en attente de traitement. Attendez la réponse de l'administration.`, {
            _: ["too many open requests"],
        });
    }
    if (data.targetSubServiceId) {
        const [sub] = await connection_1.db.select({ id: schema_ambassade_1.subServices.id }).from(schema_ambassade_1.subServices).where((0, drizzle_orm_1.eq)(schema_ambassade_1.subServices.id, data.targetSubServiceId));
        if (!sub)
            throw new utils_1.NotFoundError("Service introuvable");
    }
    const [row] = await connection_1.db
        .insert(schema_agent_requests_1.agentRequests)
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
    await (0, audit_service_1.writeAudit)({
        action: "CREATE",
        entityType: "DEMANDE_AGENT",
        entityId: row.id,
        actor,
        severity: data.category === "SECURITY" ? "WARNING" : "INFO",
        details: { kind: data.kind, category: data.category, subject: data.subject },
    });
    const requesterName = await ambassade_core_1.identityLogic.getActorName(connection_1.db, actor.userId);
    for (const adminId of await adminUserIds()) {
        if (adminId === actor.userId)
            continue;
        await ambassade_core_1.notificationsLogic.createNotification(connection_1.db, {
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
async function listMine(userId) {
    const rows = await connection_1.db.select().from(schema_agent_requests_1.agentRequests).where((0, drizzle_orm_1.eq)(schema_agent_requests_1.agentRequests.requesterUserId, userId)).orderBy((0, drizzle_orm_1.desc)(schema_agent_requests_1.agentRequests.createdAt));
    return enrich(rows);
}
async function listAll(filters) {
    const conditions = [];
    if (filters.status)
        conditions.push((0, drizzle_orm_1.eq)(schema_agent_requests_1.agentRequests.status, filters.status));
    if (filters.kind)
        conditions.push((0, drizzle_orm_1.eq)(schema_agent_requests_1.agentRequests.kind, filters.kind));
    if (filters.category)
        conditions.push((0, drizzle_orm_1.eq)(schema_agent_requests_1.agentRequests.category, filters.category));
    if (filters.search) {
        const s = `%${filters.search.trim()}%`;
        const requesterIds = connection_1.db
            .select({ id: identityUsers.id })
            .from(identityUsers)
            .leftJoin(identityUserProfiles, (0, drizzle_orm_1.eq)(identityUserProfiles.userId, identityUsers.id))
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(identityUsers.email, s), (0, drizzle_orm_1.ilike)(identityUserProfiles.firstName, s), (0, drizzle_orm_1.ilike)(identityUserProfiles.lastName, s)));
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_agent_requests_1.agentRequests.subject, s), (0, drizzle_orm_1.ilike)(schema_agent_requests_1.agentRequests.description, s), (0, drizzle_orm_1.inArray)(schema_agent_requests_1.agentRequests.requesterUserId, requesterIds)));
    }
    const where = conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const [rows, [{ total }], [{ open }]] = await Promise.all([
        connection_1.db
            .select()
            .from(schema_agent_requests_1.agentRequests)
            .where(where)
            .orderBy((0, drizzle_orm_1.desc)(schema_agent_requests_1.agentRequests.createdAt))
            .limit(limit)
            .offset((page - 1) * limit),
        connection_1.db.select({ total: (0, drizzle_orm_1.sql) `count(*)::int` }).from(schema_agent_requests_1.agentRequests).where(where),
        connection_1.db.select({ open: (0, drizzle_orm_1.sql) `count(*)::int` }).from(schema_agent_requests_1.agentRequests).where((0, drizzle_orm_1.inArray)(schema_agent_requests_1.agentRequests.status, OPEN_STATUSES)),
    ]);
    return { data: await enrich(rows), meta: { ...(0, dto_1.paginationMeta)(page, limit, total), openCount: open } };
}
async function getOwnerId(id) {
    const [row] = await connection_1.db.select({ userId: schema_agent_requests_1.agentRequests.requesterUserId }).from(schema_agent_requests_1.agentRequests).where((0, drizzle_orm_1.eq)(schema_agent_requests_1.agentRequests.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Demande introuvable");
    return row.userId;
}
async function getRequest(id) {
    const [row] = await connection_1.db.select().from(schema_agent_requests_1.agentRequests).where((0, drizzle_orm_1.eq)(schema_agent_requests_1.agentRequests.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Demande introuvable");
    return (await enrich([row]))[0];
}
async function processRequest(id, data, actor) {
    const [existing] = await connection_1.db.select().from(schema_agent_requests_1.agentRequests).where((0, drizzle_orm_1.eq)(schema_agent_requests_1.agentRequests.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Demande introuvable");
    if (FINAL_STATUSES.includes(existing.status))
        throw new utils_1.ConflictError("Cette demande a déjà été traitée.");
    if (existing.requesterUserId === actor.userId)
        throw new utils_1.ConflictError("Vous ne pouvez pas traiter votre propre demande.");
    if (FINAL_STATUSES.includes(data.status) && !data.response?.trim()) {
        throw new utils_1.ValidationError("Une réponse écrite est requise pour clore la demande.", { response: ["Required"] });
    }
    let assignmentCreated = false;
    if (data.status === "APPROVED" && existing.category === "SERVICE_ACCESS" && data.applyAssignment) {
        if (!existing.targetSubServiceId)
            throw new utils_1.ValidationError("Aucun service cible sur cette demande.", { targetSubServiceId: ["Required"] });
        const agent = await (0, enrich_1.getAgentByUserId)(existing.requesterUserId);
        if (!agent)
            throw new utils_1.ValidationError("Ce compte n'a pas de fiche agent : impossible de l'affecter.", { agent: ["not found"] });
        const [already] = await connection_1.db
            .select({ id: schema_rendezvous_1.agentServiceAssignments.id })
            .from(schema_rendezvous_1.agentServiceAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentServiceAssignments.agentId, agent.id), (0, drizzle_orm_1.eq)(schema_rendezvous_1.agentServiceAssignments.subServiceId, existing.targetSubServiceId), (0, drizzle_orm_1.eq)(schema_rendezvous_1.agentServiceAssignments.active, true)));
        if (!already) {
            await connection_1.db.insert(schema_rendezvous_1.agentServiceAssignments).values({
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
    const [updated] = await connection_1.db
        .update(schema_agent_requests_1.agentRequests)
        .set({
        status: data.status,
        adminResponse: data.response?.trim() || existing.adminResponse,
        handledBy: actor.userId,
        handledAt: new Date(),
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_agent_requests_1.agentRequests.id, id))
        .returning();
    await (0, audit_service_1.writeAudit)({
        action: "PROCESS_REQUEST",
        entityType: "DEMANDE_AGENT",
        entityId: id,
        actor,
        severity: data.status === "APPROVED" && assignmentCreated ? "WARNING" : "INFO",
        entitySnapshot: { from: existing.status, to: data.status },
        details: { category: existing.category, requester: existing.requesterUserId, assignmentCreated },
    });
    await ambassade_core_1.notificationsLogic.createNotification(connection_1.db, {
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
//# sourceMappingURL=agent-requests.service.js.map