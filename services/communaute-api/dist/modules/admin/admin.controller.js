"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.overview = overview;
exports.systemStatus = systemStatus;
exports.listMembers = listMembers;
exports.getMember = getMember;
exports.listAuditLogs = listAuditLogs;
exports.getAuditLog = getAuditLog;
exports.auditStats = auditStats;
exports.exportAuditLogs = exportAuditLogs;
exports.listTickets = listTickets;
exports.listAssignees = listAssignees;
exports.getTicket = getTicket;
exports.addTicketMessage = addTicketMessage;
exports.updateTicket = updateTicket;
const dto_1 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const ambassade_core_1 = require("@poramma/ambassade-core");
const connection_1 = require("../../db/connection");
const sanitize_1 = require("../../shared/sanitize");
const svc = __importStar(require("./admin.service"));
const DOMAIN = "COMMUNITY";
const TARGET = "COMMUNITY";
const actorOf = (req) => ({ userId: req.userId, roleName: req.roleName ?? null });
const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const oneOf = (v, allowed) => (typeof v === "string" && allowed.includes(v) ? v : undefined);
const int = (v, fallback, max) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : fallback;
};
const uuidOk = (v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
async function overview(_req, res) {
    res.json((0, dto_1.ok)(await svc.overview()));
}
async function systemStatus(_req, res) {
    res.json((0, dto_1.ok)(await svc.systemStatus()));
}
async function listMembers(req, res) {
    const page = int(req.query.page, 1, 100000);
    const limit = int(req.query.limit, 20, 100);
    const { data, total } = await svc.listMembers({
        search: str(req.query.search),
        status: oneOf(req.query.status, ["VERIFIED", "UNVERIFIED", "SUSPENDED"]),
        userType: oneOf(req.query.userType, ["student", "worker", "other"]),
        registration: oneOf(req.query.registration, ["PENDING", "VALIDATED", "REJECTED", "SUSPENDED", "NONE"]),
        page,
        limit,
    });
    res.json((0, dto_1.ok)(data, (0, dto_1.paginationMeta)(page, limit, total)));
}
async function getMember(req, res) {
    if (!uuidOk(req.params.id))
        throw new utils_1.NotFoundError("Membre introuvable");
    res.json((0, dto_1.ok)(await svc.getMember(req.params.id)));
}
function auditFilters(src) {
    return {
        actorUserId: uuidOk(src.actorUserId) ? src.actorUserId : undefined,
        actorRole: str(src.actorRole),
        action: str(src.action),
        entityType: str(src.entityType),
        entityId: str(src.entityId),
        result: oneOf(src.result, ["SUCCESS", "ERROR", "REJECT", "WARNING"]),
        severity: oneOf(src.severity, ["INFO", "WARNING", "CRITICAL"]),
        dateFrom: str(src.dateFrom),
        dateTo: str(src.dateTo),
        search: str(src.search),
        page: int(src.page, 1, 100000),
        limit: int(src.limit, 25, 200),
    };
}
async function listAuditLogs(req, res) {
    const { data, total, page, limit } = await ambassade_core_1.auditLogic.listLogs(connection_1.db, DOMAIN, auditFilters(req.query));
    res.json((0, dto_1.ok)(data, (0, dto_1.paginationMeta)(page, limit, total)));
}
async function getAuditLog(req, res) {
    const log = await ambassade_core_1.auditLogic.getLog(connection_1.db, DOMAIN, req.params.id);
    if (!log)
        throw new utils_1.NotFoundError("Entrée d'audit introuvable");
    res.json((0, dto_1.ok)(log));
}
async function auditStats(_req, res) {
    res.json((0, dto_1.ok)(await ambassade_core_1.auditLogic.getStats(connection_1.db, DOMAIN)));
}
async function exportAuditLogs(req, res) {
    const filters = auditFilters((req.body?.filters ?? {}));
    const format = req.body?.format === "JSON" ? "JSON" : "CSV";
    await ambassade_core_1.auditLogic.writeAudit(connection_1.db, {
        action: "EXPORT",
        entityType: "AUDIT",
        entityId: "-",
        actor: actorOf(req),
        severity: "WARNING",
        details: { format, domain: DOMAIN },
        ip: req.ip,
        ua: req.headers["user-agent"] ?? null,
    });
    if (format === "JSON") {
        const { data } = await ambassade_core_1.auditLogic.listLogs(connection_1.db, DOMAIN, { ...filters, page: 1, limit: 5000 });
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="audit-communaute-${Date.now()}.json"`);
        res.send(JSON.stringify(data, null, 2));
        return;
    }
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="audit-communaute-${Date.now()}.csv"`);
    res.send(await ambassade_core_1.auditLogic.exportLogsAsCsv(connection_1.db, DOMAIN, filters));
}
async function listTickets(req, res) {
    const page = int(req.query.page, 1, 100000);
    const limit = int(req.query.limit, 20, 100);
    const { data, total, stats } = await ambassade_core_1.supportLogic.listTickets(connection_1.db, TARGET, actorOf(req).userId, {
        status: oneOf(req.query.status, ["ACTIVE", ...ambassade_core_1.supportLogic.TICKET_STATUSES]),
        category: oneOf(req.query.category, ambassade_core_1.supportLogic.TICKET_CATEGORIES),
        priority: oneOf(req.query.priority, ambassade_core_1.supportLogic.TICKET_PRIORITIES),
        assigned: str(req.query.assigned),
        search: str(req.query.search),
        page,
        limit,
    });
    const meta = { ...(0, dto_1.paginationMeta)(page, limit, total), stats };
    res.json((0, dto_1.ok)(data, meta));
}
async function listAssignees(_req, res) {
    res.json((0, dto_1.ok)(await ambassade_core_1.supportLogic.listAssignees(connection_1.db, TARGET)));
}
async function getTicket(req, res) {
    res.json((0, dto_1.ok)(await ambassade_core_1.supportLogic.getTicketForStaff(connection_1.db, TARGET, req.params.id)));
}
async function addTicketMessage(req, res) {
    const content = typeof req.body?.content === "string" ? (0, sanitize_1.sanitizeText)(req.body.content) : "";
    if (content.length < 1 || content.length > 3000)
        throw new utils_1.ValidationError("Données invalides", { content: ["Le message doit contenir entre 1 et 3000 caractères"] });
    const internal = req.body?.isInternal === true;
    const actor = actorOf(req);
    const ticket = await ambassade_core_1.supportLogic.addStaffMessage(connection_1.db, TARGET, req.params.id, actor.userId, content, internal);
    await ambassade_core_1.auditLogic.writeAudit(connection_1.db, {
        action: internal ? "NOTE" : "COMMENT",
        entityType: "TICKET_SUPPORT",
        entityId: req.params.id,
        actor,
        details: { reference: ticket.reference, internal },
        ip: req.ip,
        ua: req.headers["user-agent"] ?? null,
    });
    res.status(201).json((0, dto_1.ok)(ticket, undefined, internal ? "Note interne ajoutée." : "Réponse envoyée au membre."));
}
async function updateTicket(req, res) {
    const status = oneOf(req.body?.status, ambassade_core_1.supportLogic.TICKET_STATUSES);
    const priority = oneOf(req.body?.priority, ambassade_core_1.supportLogic.TICKET_PRIORITIES);
    const hasAssignee = req.body && Object.prototype.hasOwnProperty.call(req.body, "assignedTo");
    const assignedTo = hasAssignee ? (req.body.assignedTo === null ? null : uuidOk(req.body.assignedTo) ? req.body.assignedTo : undefined) : undefined;
    if (hasAssignee && assignedTo === undefined)
        throw new utils_1.ValidationError("Données invalides", { assignedTo: ["Identifiant invalide"] });
    if (status === undefined && priority === undefined && !hasAssignee)
        throw new utils_1.ValidationError("Données invalides", { body: ["Aucune modification demandée"] });
    const actor = actorOf(req);
    const before = await ambassade_core_1.supportLogic.getTicketForStaff(connection_1.db, TARGET, req.params.id);
    const ticket = await ambassade_core_1.supportLogic.updateTicket(connection_1.db, TARGET, req.params.id, actor.userId, { status, priority, assignedTo });
    await ambassade_core_1.auditLogic.writeAudit(connection_1.db, {
        action: hasAssignee && status === undefined ? "ASSIGN" : "UPDATE_STATUS",
        entityType: "TICKET_SUPPORT",
        entityId: req.params.id,
        actor,
        severity: status === "CLOSED" ? "WARNING" : "INFO",
        entitySnapshot: {
            from: { status: before.status, priority: before.priority, assignee: before.assignee?.name ?? null },
            to: { status: ticket.status, priority: ticket.priority, assignee: ticket.assignee?.name ?? null },
        },
        details: { reference: ticket.reference },
        ip: req.ip,
        ua: req.headers["user-agent"] ?? null,
    });
    res.json((0, dto_1.ok)(ticket));
}
//# sourceMappingURL=admin.controller.js.map