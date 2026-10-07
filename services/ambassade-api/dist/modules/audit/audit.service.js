"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAudit = writeAudit;
exports.enrichLogs = enrichLogs;
exports.enrichLog = enrichLog;
exports.listLogs = listLogs;
exports.getLog = getLog;
exports.getStats = getStats;
exports.exportLogsAsCsv = exportLogsAsCsv;
exports.listMyActivity = listMyActivity;
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../db/connection");
const schema_audit_1 = require("../../db/schema.audit");
const schema_demandes_1 = require("../../db/schema.demandes");
const schema_rendezvous_1 = require("../../db/schema.rendezvous");
const schema_etudiants_1 = require("../../db/schema.etudiants");
const ambassade_core_1 = require("@poramma/ambassade-core");
const dto_1 = require("@poramma/dto");
async function writeAudit(params) {
    return ambassade_core_1.auditLogic.writeAudit(connection_1.db, params);
}
const DOMAIN = "EMBASSY";
async function enrichLogs(rows) {
    return ambassade_core_1.auditLogic.enrichLogs(connection_1.db, rows);
}
async function enrichLog(row) {
    return (await enrichLogs([row]))[0];
}
async function listLogs(filters) {
    const { data, total, page, limit } = await ambassade_core_1.auditLogic.listLogs(connection_1.db, DOMAIN, filters);
    return { data, meta: (0, dto_1.paginationMeta)(page, limit, total) };
}
async function getLog(id) {
    return ambassade_core_1.auditLogic.getLog(connection_1.db, DOMAIN, id);
}
async function getStats() {
    return ambassade_core_1.auditLogic.getStats(connection_1.db, DOMAIN);
}
async function exportLogsAsCsv(filters) {
    return ambassade_core_1.auditLogic.exportLogsAsCsv(connection_1.db, DOMAIN, filters);
}
async function listMyActivity(userId, opts) {
    const page = opts.page ?? 1;
    const limit = opts.limit ?? 20;
    const where = (0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.actorUserId, userId);
    const [rows, [{ total }]] = await Promise.all([
        connection_1.db
            .select()
            .from(schema_audit_1.auditLogs)
            .where(where)
            .orderBy((0, drizzle_orm_1.desc)(schema_audit_1.auditLogs.at))
            .limit(limit)
            .offset((page - 1) * limit),
        connection_1.db.select({ total: (0, drizzle_orm_1.sql) `count(*)::int` }).from(schema_audit_1.auditLogs).where(where),
    ]);
    const idsOf = (type) => [...new Set(rows.filter((r) => r.entityType === type && r.entityId !== "-").map((r) => r.entityId))];
    const demandeIds = idsOf("DEMANDE");
    const rdvIds = idsOf("RENDEZ_VOUS");
    const etudiantIds = idsOf("ETUDIANT");
    const [demandeRows, rdvRows, etuRows] = await Promise.all([
        demandeIds.length ? connection_1.db.select({ id: schema_demandes_1.demandes.id, label: schema_demandes_1.demandes.dossierNumber }).from(schema_demandes_1.demandes).where((0, drizzle_orm_1.inArray)(schema_demandes_1.demandes.id, demandeIds)) : [],
        rdvIds.length ? connection_1.db.select({ id: schema_rendezvous_1.rendezVous.id, label: schema_rendezvous_1.rendezVous.ticketId }).from(schema_rendezvous_1.rendezVous).where((0, drizzle_orm_1.inArray)(schema_rendezvous_1.rendezVous.id, rdvIds)) : [],
        etudiantIds.length ? connection_1.db.select({ id: schema_etudiants_1.etudiants.id, userId: schema_etudiants_1.etudiants.userId }).from(schema_etudiants_1.etudiants).where((0, drizzle_orm_1.inArray)(schema_etudiants_1.etudiants.id, etudiantIds)) : [],
    ]);
    const students = await ambassade_core_1.identityLogic.getUsersByIds(connection_1.db, etuRows.map((e) => e.userId));
    const labelOf = (r) => {
        if (r.entityId === "-")
            return null;
        if (r.entityType === "DEMANDE")
            return demandeRows.find((d) => d.id === r.entityId)?.label ?? null;
        if (r.entityType === "RENDEZ_VOUS")
            return rdvRows.find((d) => d.id === r.entityId)?.label ?? null;
        if (r.entityType === "ETUDIANT") {
            const e = etuRows.find((x) => x.id === r.entityId);
            const p = e ? students.get(e.userId)?.profile : null;
            return p ? [p.firstName, p.lastName].filter(Boolean).join(" ") : null;
        }
        return null;
    };
    return {
        data: rows.map((r) => ({
            id: r.id,
            at: r.at,
            action: r.action,
            entityType: r.entityType,
            entityId: r.entityId,
            targetLabel: labelOf(r),
            result: r.result,
            severity: r.severity,
        })),
        meta: (0, dto_1.paginationMeta)(page, limit, total),
    };
}
//# sourceMappingURL=audit.service.js.map