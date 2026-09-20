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
exports.listLogs = listLogs;
exports.getLog = getLog;
exports.getStats = getStats;
exports.exportLogs = exportLogs;
exports.listMyActivity = listMyActivity;
const svc = __importStar(require("./audit.service"));
const dto_1 = require("./dto");
const dto_2 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
async function listLogs(req, res) {
    const parsed = dto_1.listAuditLogsQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    const { data, meta } = await svc.listLogs(parsed.data);
    res.json((0, dto_2.ok)(data, meta));
}
async function getLog(req, res) {
    const log = await svc.getLog(req.params.id);
    if (!log)
        throw new utils_1.NotFoundError("Entrée d'audit introuvable");
    res.json((0, dto_2.ok)(log));
}
async function getStats(req, res) {
    res.json((0, dto_2.ok)(await svc.getStats()));
}
async function exportLogs(req, res) {
    const parsed = dto_1.exportAuditLogsDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const { filters, format } = parsed.data;
    if (format === "JSON") {
        const { data: logs } = await svc.listLogs({ ...filters, page: 1, limit: 5000 });
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="audit-export-${Date.now()}.json"`);
        res.send(JSON.stringify(logs, null, 2));
        return;
    }
    const csv = await svc.exportLogsAsCsv(filters);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="audit-export-${Date.now()}.csv"`);
    res.send(csv);
}
async function listMyActivity(req, res) {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Math.min(Number(req.query.limit) > 0 ? Number(req.query.limit) : 20, 100);
    const { data, meta } = await svc.listMyActivity(req.userId, { page, limit });
    res.json((0, dto_2.ok)(data, meta));
}
//# sourceMappingURL=audit.controller.js.map