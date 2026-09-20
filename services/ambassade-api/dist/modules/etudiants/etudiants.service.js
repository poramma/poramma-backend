"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEtudiants = listEtudiants;
exports.getEtudiantDetail = getEtudiantDetail;
exports.searchEtudiants = searchEtudiants;
exports.getEtudiantDocuments = getEtudiantDocuments;
exports.getEtudiantAudit = getEtudiantAudit;
exports.validateEtudiant = validateEtudiant;
exports.rejectEtudiant = rejectEtudiant;
exports.suspendEtudiant = suspendEtudiant;
exports.assignInueToEtudiant = assignInueToEtudiant;
exports.estimateEtudiants = estimateEtudiants;
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../db/connection");
const schema_etudiants_1 = require("../../db/schema.etudiants");
const schema_audit_1 = require("../../db/schema.audit");
const utils_1 = require("@poramma/utils");
const dto_1 = require("@poramma/dto");
const audit_service_1 = require("../audit/audit.service");
const inue_service_1 = require("../inue/inue.service");
const documents_service_1 = require("../documents/documents.service");
const etudiants_source_1 = require("./etudiants-source");
const ambassade_core_1 = require("@poramma/ambassade-core");
function mergeView(raw, tracking) {
    return {
        id: raw.userId,
        userId: raw.userId,
        email: raw.email,
        phone: raw.phone,
        firstName: raw.firstName,
        lastName: raw.lastName,
        nationality: raw.nationality,
        city: raw.city,
        country: raw.country,
        registeredAt: raw.registeredAt,
        accountStatus: raw.accountStatus,
        profile: {
            university: raw.university,
            faculty: raw.faculty,
            studyLevel: raw.studyLevel,
        },
        bourse: raw.hasBourse
            ? { isRecipient: true, decisionNumber: raw.scholarshipDecisionNumber, promotion: raw.scholarshipPromotion }
            : null,
        status: tracking?.status ?? "PENDING",
        inue: tracking?.inue ?? null,
        inueAssignedAt: tracking?.inueAssignedAt ?? null,
        submittedAt: tracking?.submittedAt ?? null,
        reviewNote: tracking?.reviewNote ?? null,
        reviewedBy: tracking?.reviewedBy ?? null,
        reviewedAt: tracking?.reviewedAt ?? null,
    };
}
async function fetchTrackingByUserIds(userIds) {
    if (userIds.length === 0)
        return new Map();
    const rows = await connection_1.db.select().from(schema_etudiants_1.etudiants).where((0, drizzle_orm_1.inArray)(schema_etudiants_1.etudiants.userId, userIds));
    return new Map(rows.map((r) => [r.userId, r]));
}
async function ensureEtudiantRecord(userId) {
    return ambassade_core_1.etudiantsLogic.ensureEtudiantRecord(connection_1.db, userId);
}
async function getRawOrThrow(userId) {
    const raw = await etudiants_source_1.etudiantsSource.findByUserId(userId);
    if (!raw)
        throw new utils_1.NotFoundError("Étudiant introuvable");
    return raw;
}
async function listEtudiants(filters) {
    const sourceFilters = {
        search: filters.search,
        city: filters.city,
        university: filters.university,
        faculty: filters.faculty,
        studyLevel: filters.studyLevel,
        hasBourse: filters.hasBourse,
    };
    const rawList = await etudiants_source_1.etudiantsSource.list(sourceFilters);
    const tracking = await fetchTrackingByUserIds(rawList.map((r) => r.userId));
    let merged = rawList.map((r) => mergeView(r, tracking.get(r.userId) ?? null));
    if (filters.status)
        merged = merged.filter((e) => e.status === filters.status);
    if (filters.hasInue !== undefined)
        merged = merged.filter((e) => (filters.hasInue ? !!e.inue : !e.inue));
    const sortBy = filters.sortBy ?? "registeredAt";
    const dir = filters.sortOrder === "asc" ? 1 : -1;
    merged.sort((a, b) => {
        if (sortBy === "name") {
            return dir * `${a.lastName ?? ""} ${a.firstName ?? ""}`.localeCompare(`${b.lastName ?? ""} ${b.firstName ?? ""}`);
        }
        if (sortBy === "status")
            return dir * a.status.localeCompare(b.status);
        const at = a.registeredAt ? new Date(a.registeredAt).getTime() : 0;
        const bt = b.registeredAt ? new Date(b.registeredAt).getTime() : 0;
        return dir * (at - bt);
    });
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const total = merged.length;
    const start = (page - 1) * limit;
    const data = merged.slice(start, start + limit);
    return { data, meta: (0, dto_1.paginationMeta)(page, limit, total) };
}
async function getEtudiantDetail(userId) {
    const raw = await getRawOrThrow(userId);
    const tracking = await ensureEtudiantRecord(userId);
    return mergeView(raw, tracking);
}
async function searchEtudiants(query) {
    const rawList = await etudiants_source_1.etudiantsSource.search(query);
    const tracking = await fetchTrackingByUserIds(rawList.map((r) => r.userId));
    return rawList.map((r) => mergeView(r, tracking.get(r.userId) ?? null));
}
async function getEtudiantDocuments(userId) {
    await getRawOrThrow(userId);
    return (0, documents_service_1.listDocuments)({ ownerUserId: userId, limit: 200 });
}
async function getEtudiantAudit(userId) {
    const tracking = await ensureEtudiantRecord(userId);
    const rows = await connection_1.db
        .select()
        .from(schema_audit_1.auditLogs)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.entityType, "ETUDIANT"), (0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.entityId, tracking.id)))
        .orderBy((0, drizzle_orm_1.desc)(schema_audit_1.auditLogs.at));
    return Promise.all(rows.map(audit_service_1.enrichLog));
}
async function validateEtudiant(userId, comment, actor) {
    await getRawOrThrow(userId);
    const tracking = await ensureEtudiantRecord(userId);
    if (tracking.status === "SUSPENDED") {
        throw new utils_1.ConflictError("Un dossier suspendu ne peut pas être validé directement.");
    }
    const [updated] = await connection_1.db
        .update(schema_etudiants_1.etudiants)
        .set({ status: "VALIDATED", reviewNote: comment ?? null, reviewedBy: actor.userId, reviewedAt: new Date(), updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_etudiants_1.etudiants.id, tracking.id))
        .returning();
    await (0, audit_service_1.writeAudit)({
        action: "VALIDATE",
        entityType: "ETUDIANT",
        entityId: tracking.id,
        actor,
        details: { comment: comment ?? null },
    });
    await ambassade_core_1.notificationsLogic.notifyRegistrationDecision(connection_1.db, { userId, decision: "VALIDATED", inue: updated.inue });
    const raw = await getRawOrThrow(userId);
    return mergeView(raw, updated);
}
async function rejectEtudiant(userId, reason, actor) {
    await getRawOrThrow(userId);
    const tracking = await ensureEtudiantRecord(userId);
    const [updated] = await connection_1.db
        .update(schema_etudiants_1.etudiants)
        .set({ status: "REJECTED", reviewNote: reason, reviewedBy: actor.userId, reviewedAt: new Date(), updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_etudiants_1.etudiants.id, tracking.id))
        .returning();
    await (0, audit_service_1.writeAudit)({
        action: "REJECT",
        entityType: "ETUDIANT",
        entityId: tracking.id,
        actor,
        result: "REJECT",
        details: { reason },
    });
    await ambassade_core_1.notificationsLogic.notifyRegistrationDecision(connection_1.db, { userId, decision: "REJECTED", note: reason });
    const raw = await getRawOrThrow(userId);
    return mergeView(raw, updated);
}
async function suspendEtudiant(userId, reason, actor) {
    await getRawOrThrow(userId);
    const tracking = await ensureEtudiantRecord(userId);
    const [updated] = await connection_1.db
        .update(schema_etudiants_1.etudiants)
        .set({ status: "SUSPENDED", reviewNote: reason, reviewedBy: actor.userId, reviewedAt: new Date(), updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_etudiants_1.etudiants.id, tracking.id))
        .returning();
    await (0, audit_service_1.writeAudit)({
        action: "SUSPEND",
        entityType: "ETUDIANT",
        entityId: tracking.id,
        actor,
        severity: "WARNING",
        details: { reason },
    });
    await ambassade_core_1.notificationsLogic.notifyRegistrationDecision(connection_1.db, { userId, decision: "SUSPENDED", note: reason });
    const raw = await getRawOrThrow(userId);
    return mergeView(raw, updated);
}
function determineInueYear(raw) {
    if (raw.hasBourse && raw.scholarshipPromotion) {
        const parsed = parseInt(raw.scholarshipPromotion, 10);
        if (!Number.isNaN(parsed))
            return parsed;
    }
    return raw.registeredAt ? new Date(raw.registeredAt).getFullYear() : new Date().getFullYear();
}
async function assignInueToEtudiant(userId, actor, yearOverride) {
    const raw = await getRawOrThrow(userId);
    const tracking = await ensureEtudiantRecord(userId);
    if (tracking.status !== "VALIDATED") {
        throw new utils_1.ConflictError("Seul un étudiant validé peut se voir attribuer un INUE.");
    }
    const year = yearOverride ?? determineInueYear(raw);
    const result = await (0, inue_service_1.assignInue)(tracking.id, year, actor);
    const updatedRaw = await getRawOrThrow(userId);
    const [updatedTracking] = await connection_1.db.select().from(schema_etudiants_1.etudiants).where((0, drizzle_orm_1.eq)(schema_etudiants_1.etudiants.id, tracking.id));
    await ambassade_core_1.notificationsLogic.notifyRegistrationDecision(connection_1.db, { userId, decision: "INUE_ASSIGNED", inue: updatedTracking.inue });
    return { ...mergeView(updatedRaw, updatedTracking), inueAssignment: result };
}
async function estimateEtudiants(filters) {
    const { data, meta } = await listEtudiants({ ...filters, page: 1, limit: 1_000_000 });
    return { count: meta.total, sample: data.slice(0, 5).map((e) => ({ id: e.id, firstName: e.firstName, lastName: e.lastName })) };
}
//# sourceMappingURL=etudiants.service.js.map