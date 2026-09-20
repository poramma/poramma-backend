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
const { identityUsers, identityUserProfiles } = ambassade_core_1.identitySchema;
function endOfRange(dateTo) {
    const d = new Date(dateTo);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo))
        d.setUTCHours(23, 59, 59, 999);
    return d;
}
function buildConditions(filters) {
    const conditions = [];
    if (filters.actorUserId)
        conditions.push((0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.actorUserId, filters.actorUserId));
    if (filters.actorRole)
        conditions.push((0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.actorRole, filters.actorRole));
    if (filters.action)
        conditions.push((0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.action, filters.action));
    if (filters.entityType)
        conditions.push((0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.entityType, filters.entityType));
    if (filters.entityId)
        conditions.push((0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.entityId, filters.entityId));
    if (filters.result)
        conditions.push((0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.result, filters.result));
    if (filters.severity)
        conditions.push((0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.severity, filters.severity));
    if (filters.dateFrom)
        conditions.push((0, drizzle_orm_1.gte)(schema_audit_1.auditLogs.at, new Date(filters.dateFrom)));
    if (filters.dateTo)
        conditions.push((0, drizzle_orm_1.lte)(schema_audit_1.auditLogs.at, endOfRange(filters.dateTo)));
    if (filters.search) {
        const s = `%${filters.search.trim()}%`;
        const actorIds = connection_1.db
            .select({ id: identityUsers.id })
            .from(identityUsers)
            .leftJoin(identityUserProfiles, (0, drizzle_orm_1.eq)(identityUserProfiles.userId, identityUsers.id))
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(identityUsers.email, s), (0, drizzle_orm_1.ilike)(identityUserProfiles.firstName, s), (0, drizzle_orm_1.ilike)(identityUserProfiles.lastName, s)));
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_audit_1.auditLogs.action, s), (0, drizzle_orm_1.ilike)(schema_audit_1.auditLogs.entityType, s), (0, drizzle_orm_1.ilike)(schema_audit_1.auditLogs.entityId, s), (0, drizzle_orm_1.ilike)(schema_audit_1.auditLogs.actorRole, s), (0, drizzle_orm_1.inArray)(schema_audit_1.auditLogs.actorUserId, actorIds)));
    }
    return conditions;
}
function toView(row, users) {
    const user = row.actorUserId ? users.get(row.actorUserId) : undefined;
    return {
        id: row.id,
        at: row.at,
        actorUserId: row.actorUserId,
        actorEmail: user?.email ?? null,
        actorInue: user?.profile?.inue ?? null,
        actorName: user?.profile ? [user.profile.firstName, user.profile.lastName].filter(Boolean).join(" ") || null : null,
        actorRole: row.actorRole ?? "UNKNOWN",
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        entitySnapshot: row.entitySnapshot,
        result: row.result,
        details: row.details,
        ip: row.ip,
        ua: row.ua,
        sessionId: row.sessionId,
        severity: row.severity,
    };
}
async function enrichLogs(rows) {
    const users = await ambassade_core_1.identityLogic.getUsersByIds(connection_1.db, rows.map((r) => r.actorUserId).filter((id) => !!id));
    return rows.map((r) => toView(r, users));
}
async function enrichLog(row) {
    return (await enrichLogs([row]))[0];
}
async function listLogs(filters) {
    const conditions = buildConditions(filters);
    const where = conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
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
    return {
        data: await enrichLogs(rows),
        meta: (0, dto_1.paginationMeta)(page, limit, total),
    };
}
async function getLog(id) {
    const [row] = await connection_1.db.select().from(schema_audit_1.auditLogs).where((0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.id, id));
    if (!row)
        return null;
    return enrichLog(row);
}
async function getStats() {
    const [sev, res, [failed]] = await Promise.all([
        connection_1.db.select({ k: schema_audit_1.auditLogs.severity, n: (0, drizzle_orm_1.sql) `count(*)::int` }).from(schema_audit_1.auditLogs).groupBy(schema_audit_1.auditLogs.severity),
        connection_1.db.select({ k: schema_audit_1.auditLogs.result, n: (0, drizzle_orm_1.sql) `count(*)::int` }).from(schema_audit_1.auditLogs).groupBy(schema_audit_1.auditLogs.result),
        connection_1.db
            .select({ n: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_audit_1.auditLogs)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.action, "LOGIN_ATTEMPT"), (0, drizzle_orm_1.eq)(schema_audit_1.auditLogs.result, "REJECT"))),
    ]);
    const bySeverity = { INFO: 0, WARNING: 0, CRITICAL: 0 };
    const byResult = { SUCCESS: 0, ERROR: 0, REJECT: 0, WARNING: 0 };
    for (const r of sev)
        bySeverity[r.k] = r.n;
    for (const r of res)
        byResult[r.k] = r.n;
    return {
        total: Object.values(bySeverity).reduce((a, b) => a + b, 0),
        bySeverity,
        byResult,
        failedLogins: failed?.n ?? 0,
        criticalEvents: bySeverity.CRITICAL,
    };
}
async function exportLogsAsCsv(filters) {
    const { data: logs } = await listLogs({ ...filters, page: 1, limit: 5000 });
    const header = ["date_heure", "acteur", "email", "role", "action", "entite", "identifiant", "resultat", "severite", "ip"].join(",");
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = logs.map((l) => [new Date(l.at).toISOString(), l.actorName ?? "", l.actorEmail ?? "", l.actorRole, l.action, l.entityType, l.entityId, l.result, l.severity, l.ip ?? ""]
        .map(escape)
        .join(","));
    return [header, ...rows].join("\n");
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