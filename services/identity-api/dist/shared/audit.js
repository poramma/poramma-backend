"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAuditDomain = resolveAuditDomain;
exports.writeAudit = writeAudit;
const crypto_1 = __importDefault(require("crypto"));
const utils_1 = require("@poramma/utils");
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../db/connection");
const schema_audit_write_1 = require("../db/schema.audit-write");
const schema_identity_1 = require("../db/schema.identity");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
const DOMAIN_TTL_MS = 60_000;
const DOMAIN_CACHE_MAX = 5_000;
const domainCache = new Map();
async function resolveAuditDomain(userId, fallback = "EMBASSY") {
    if (!userId)
        return fallback;
    const hit = domainCache.get(userId);
    if (hit && hit.expires > Date.now())
        return hit.domain;
    const [agent] = await connection_1.db.select({ id: schema_identity_1.agents.id }).from(schema_identity_1.agents).where((0, drizzle_orm_1.eq)(schema_identity_1.agents.userId, userId)).limit(1);
    let domain = agent ? "EMBASSY" : "COMMUNITY";
    if (!agent) {
        const [embassyRole] = await connection_1.db
            .select({ id: schema_identity_1.userRoles.id })
            .from(schema_identity_1.userRoles)
            .innerJoin(schema_identity_1.roles, (0, drizzle_orm_1.eq)(schema_identity_1.roles.id, schema_identity_1.userRoles.roleId))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.userRoles.userId, userId), (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.isActive, true), (0, drizzle_orm_1.eq)(schema_identity_1.roles.scope, "EMBASSY")))
            .limit(1);
        if (embassyRole)
            domain = "EMBASSY";
    }
    if (domainCache.size >= DOMAIN_CACHE_MAX)
        domainCache.clear();
    domainCache.set(userId, { domain, expires: Date.now() + DOMAIN_TTL_MS });
    return domain;
}
async function writeAudit(params) {
    (0, utils_1.markAudited)();
    const domain = params.domain ?? (await resolveAuditDomain(params.actor.userId));
    await connection_1.db.insert(schema_audit_write_1.auditLogs).values({
        id: newId("aud"),
        actorUserId: params.actor.userId,
        actorRole: params.actor.roleName,
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
//# sourceMappingURL=audit.js.map