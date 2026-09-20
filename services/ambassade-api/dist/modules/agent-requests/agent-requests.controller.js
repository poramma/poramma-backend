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
exports.createRequest = createRequest;
exports.listMine = listMine;
exports.listAll = listAll;
exports.getOne = getOne;
exports.processRequest = processRequest;
const svc = __importStar(require("./agent-requests.service"));
const dto_1 = require("./dto");
const dto_2 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
const actorOf = (req) => ({ userId: req.userId, roleName: req.roleName });
function assertStaff(req) {
    if ((req.roleLevel ?? 999) >= 999)
        throw new utils_1.ForbiddenError("Réservé au personnel de l'ambassade");
}
async function createRequest(req, res) {
    assertStaff(req);
    const parsed = dto_1.createAgentRequestDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.status(201).json((0, dto_2.ok)(await svc.createRequest(actorOf(req), parsed.data), undefined, "Votre demande a été transmise à l'administrateur."));
}
async function listMine(req, res) {
    assertStaff(req);
    res.json((0, dto_2.ok)(await svc.listMine(actorOf(req).userId)));
}
async function listAll(req, res) {
    const parsed = dto_1.listAgentRequestsQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    const { data, meta } = await svc.listAll(parsed.data);
    res.json((0, dto_2.ok)(data, meta));
}
async function getOne(req, res) {
    const permissions = req.permissions || [];
    const isAdmin = permissions.includes("user:admin");
    if (!isAdmin && (await svc.getOwnerId(req.params.id)) !== actorOf(req).userId)
        throw new utils_1.ForbiddenError("Accès non autorisé à cette demande");
    res.json((0, dto_2.ok)(await svc.getRequest(req.params.id)));
}
async function processRequest(req, res) {
    const parsed = dto_1.processAgentRequestDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.processRequest(req.params.id, parsed.data, actorOf(req))));
}
//# sourceMappingURL=agent-requests.controller.js.map