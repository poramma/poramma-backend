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
exports.getOverview = getOverview;
exports.listThreads = listThreads;
exports.getThread = getThread;
exports.addMessage = addMessage;
exports.setStatus = setStatus;
const zod_1 = require("zod");
const dto_1 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const ambassade_core_1 = require("@poramma/ambassade-core");
const connection_1 = require("../../db/connection");
const audit_service_1 = require("../audit/audit.service");
const svc = __importStar(require("./culture.service"));
const listQueryDto = zod_1.z.object({
    status: zod_1.z.enum(["ACTIVE", "OPEN", "ANSWERED", "CLOSED"]).optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
});
const messageDto = zod_1.z.object({
    content: zod_1.z.string().trim().min(1, "Message vide").max(3000),
    isInternal: zod_1.z.boolean().optional(),
});
const statusDto = zod_1.z.object({ status: zod_1.z.enum(["OPEN", "CLOSED"]) });
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
const actorOf = (req) => ({ userId: req.userId, roleName: req.roleName ?? null });
async function getOverview(req, res) {
    const actor = actorOf(req);
    res.json((0, dto_1.ok)(await svc.overview(actor.userId, actor.roleName)));
}
async function listThreads(req, res) {
    const parsed = listQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    const { data, total, page, limit, stats } = await ambassade_core_1.cultureLogic.listThreads(connection_1.db, parsed.data);
    const meta = { ...(0, dto_1.paginationMeta)(page, limit, total), stats };
    res.json((0, dto_1.ok)(data, meta));
}
async function getThread(req, res) {
    res.json((0, dto_1.ok)(await ambassade_core_1.cultureLogic.getThreadForStaff(connection_1.db, req.params.id)));
}
async function addMessage(req, res) {
    const parsed = messageDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const actor = actorOf(req);
    const internal = parsed.data.isInternal ?? false;
    const thread = await ambassade_core_1.cultureLogic.addStaffMessage(connection_1.db, req.params.id, actor.userId, parsed.data.content, internal);
    await (0, audit_service_1.writeAudit)({
        action: internal ? "NOTE" : "COMMENT",
        entityType: "CULTURE_ECHANGE",
        entityId: req.params.id,
        actor,
        details: { reference: thread.reference, internal },
    });
    res.status(201).json((0, dto_1.ok)(thread, undefined, internal ? "Note interne ajoutée." : "Réponse envoyée."));
}
async function setStatus(req, res) {
    const parsed = statusDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const actor = actorOf(req);
    const thread = await ambassade_core_1.cultureLogic.setThreadStatus(connection_1.db, req.params.id, actor.userId, parsed.data.status);
    await (0, audit_service_1.writeAudit)({
        action: "UPDATE_STATUS",
        entityType: "CULTURE_ECHANGE",
        entityId: req.params.id,
        actor,
        entitySnapshot: { toStatus: thread.status },
        details: { reference: thread.reference },
    });
    res.json((0, dto_1.ok)(thread));
}
//# sourceMappingURL=culture.controller.js.map