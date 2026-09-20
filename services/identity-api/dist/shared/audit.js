"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAudit = writeAudit;
const crypto_1 = __importDefault(require("crypto"));
const utils_1 = require("@poramma/utils");
const connection_1 = require("../db/connection");
const schema_audit_write_1 = require("../db/schema.audit-write");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
async function writeAudit(params) {
    (0, utils_1.markAudited)();
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
    });
}
//# sourceMappingURL=audit.js.map