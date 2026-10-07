"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveDomain = resolveDomain;
exports.writeAudit = writeAudit;
exports.enrichLogs = enrichLogs;
exports.listLogs = listLogs;
exports.getLog = getLog;
exports.getStats = getStats;
exports.exportLogsAsCsv = exportLogsAsCsv;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const audit_1 = require("../schema/audit");
const identity_1 = require("../schema/identity");
const identity_2 = require("./identity");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
const DOMAIN_TTL_MS = 60_000;
const DOMAIN_CACHE_MAX = 5_000;
const domainCache = new Map();
async function resolveDomain(db, userId, fallback = "EMBASSY") {
    if (!userId)
        return fallback;
    const hit = domainCache.get(userId);
    if (hit && hit.expires > Date.now())
        return hit.domain;
    const [agent] = await db.select({ id: identity_1.identityAgents.id }).from(identity_1.identityAgents).where((0, drizzle_orm_1.eq)(identity_1.identityAgents.userId, userId)).limit(1);
    let domain = agent ? "EMBASSY" : "COMMUNITY";
    if (!agent) {
        const [embassyRole] = await db
            .select({ id: identity_1.identityUserRoles.id })
            .from(identity_1.identityUserRoles)
            .innerJoin(identity_1.identityRoles, (0, drizzle_orm_1.eq)(identity_1.identityRoles.id, identity_1.identityUserRoles.roleId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(identity_1.identityUserRoles.userId, userId), (0, drizzle_orm_1.eq)(identity_1.identityUserRoles.isActive, true), (0, drizzle_orm_1.eq)(identity_1.identityRoles.scope, "EMBASSY")))
            .limit(1);
        if (embassyRole)
            domain = "EMBASSY";
    }
    if (domainCache.size >= DOMAIN_CACHE_MAX)
        domainCache.clear();
    domainCache.set(userId, { domain, expires: Date.now() + DOMAIN_TTL_MS });
    return domain;
}
async function writeAudit(db, params) {
    (0, utils_1.markAudited)();
    const conn = params.tx ?? db;
    const domain = params.domain ?? (await resolveDomain(db, params.actor?.userId));
    await conn.insert(audit_1.auditLogs).values({
        id: newId("aud"),
        actorUserId: params.actor?.userId ?? null,
        actorRole: params.actor?.roleName ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        entitySnapshot: params.entitySnapshot ?? null,
        result: params.result ?? "SUCCESS",
        details: params.details ?? null,
        ip: params.ip ?? null,
        ua: params.ua ?? null,
        sessionId: params.sessionId ?? null,
        severity: params.severity ?? "INFO",
        domain,
    });
}
function endOfRange(dateTo) {
    const d = new Date(dateTo);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateTo))
        d.setUTCHours(23, 59, 59, 999);
    return d;
}
function buildConditions(db, domain, filters) {
    const conditions = [(0, drizzle_orm_1.eq)(audit_1.auditLogs.domain, domain)];
    if (filters.actorUserId)
        conditions.push((0, drizzle_orm_1.eq)(audit_1.auditLogs.actorUserId, filters.actorUserId));
    if (filters.actorRole)
        conditions.push((0, drizzle_orm_1.eq)(audit_1.auditLogs.actorRole, filters.actorRole));
    if (filters.action)
        conditions.push((0, drizzle_orm_1.eq)(audit_1.auditLogs.action, filters.action));
    if (filters.entityType)
        conditions.push((0, drizzle_orm_1.eq)(audit_1.auditLogs.entityType, filters.entityType));
    if (filters.entityId)
        conditions.push((0, drizzle_orm_1.eq)(audit_1.auditLogs.entityId, filters.entityId));
    if (filters.result)
        conditions.push((0, drizzle_orm_1.eq)(audit_1.auditLogs.result, filters.result));
    if (filters.severity)
        conditions.push((0, drizzle_orm_1.eq)(audit_1.auditLogs.severity, filters.severity));
    if (filters.dateFrom)
        conditions.push((0, drizzle_orm_1.gte)(audit_1.auditLogs.at, new Date(filters.dateFrom)));
    if (filters.dateTo)
        conditions.push((0, drizzle_orm_1.lte)(audit_1.auditLogs.at, endOfRange(filters.dateTo)));
    if (filters.search) {
        const s = `%${filters.search.trim()}%`;
        const actorIds = db
            .select({ id: identity_1.identityUsers.id })
            .from(identity_1.identityUsers)
            .leftJoin(identity_1.identityUserProfiles, (0, drizzle_orm_1.eq)(identity_1.identityUserProfiles.userId, identity_1.identityUsers.id))
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(identity_1.identityUsers.email, s), (0, drizzle_orm_1.ilike)(identity_1.identityUserProfiles.firstName, s), (0, drizzle_orm_1.ilike)(identity_1.identityUserProfiles.lastName, s)));
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(audit_1.auditLogs.action, s), (0, drizzle_orm_1.ilike)(audit_1.auditLogs.entityType, s), (0, drizzle_orm_1.ilike)(audit_1.auditLogs.entityId, s), (0, drizzle_orm_1.ilike)(audit_1.auditLogs.actorRole, s), (0, drizzle_orm_1.inArray)(audit_1.auditLogs.actorUserId, actorIds)));
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
async function enrichLogs(db, rows) {
    const users = await (0, identity_2.getUsersByIds)(db, rows.map((r) => r.actorUserId).filter((id) => !!id));
    return rows.map((r) => toView(r, users));
}
async function listLogs(db, domain, filters) {
    const where = (0, drizzle_orm_1.and)(...buildConditions(db, domain, filters));
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 25;
    const [rows, [{ total }]] = await Promise.all([
        db
            .select()
            .from(audit_1.auditLogs)
            .where(where)
            .orderBy((0, drizzle_orm_1.desc)(audit_1.auditLogs.at))
            .limit(limit)
            .offset((page - 1) * limit),
        db.select({ total: (0, drizzle_orm_1.sql) `count(*)::int` }).from(audit_1.auditLogs).where(where),
    ]);
    return { data: await enrichLogs(db, rows), total, page, limit };
}
async function getLog(db, domain, id) {
    const [row] = await db
        .select()
        .from(audit_1.auditLogs)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(audit_1.auditLogs.id, id), (0, drizzle_orm_1.eq)(audit_1.auditLogs.domain, domain)));
    if (!row)
        return null;
    return (await enrichLogs(db, [row]))[0];
}
async function getStats(db, domain) {
    const inDomain = (0, drizzle_orm_1.eq)(audit_1.auditLogs.domain, domain);
    const [sev, res, [failed]] = await Promise.all([
        db.select({ k: audit_1.auditLogs.severity, n: (0, drizzle_orm_1.sql) `count(*)::int` }).from(audit_1.auditLogs).where(inDomain).groupBy(audit_1.auditLogs.severity),
        db.select({ k: audit_1.auditLogs.result, n: (0, drizzle_orm_1.sql) `count(*)::int` }).from(audit_1.auditLogs).where(inDomain).groupBy(audit_1.auditLogs.result),
        db
            .select({ n: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(audit_1.auditLogs)
            .where((0, drizzle_orm_1.and)(inDomain, (0, drizzle_orm_1.eq)(audit_1.auditLogs.action, "LOGIN_ATTEMPT"), (0, drizzle_orm_1.eq)(audit_1.auditLogs.result, "REJECT"))),
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
async function exportLogsAsCsv(db, domain, filters) {
    const { data: logs } = await listLogs(db, domain, { ...filters, page: 1, limit: 5000 });
    const header = ["date_heure", "acteur", "email", "role", "action", "entite", "identifiant", "resultat", "severite", "ip"].join(",");
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = logs.map((l) => [new Date(l.at).toISOString(), l.actorName ?? "", l.actorEmail ?? "", l.actorRole, l.action, l.entityType, l.entityId, l.result, l.severity, l.ip ?? ""]
        .map(escape)
        .join(","));
    return [header, ...rows].join("\n");
}
//# sourceMappingURL=audit.js.map