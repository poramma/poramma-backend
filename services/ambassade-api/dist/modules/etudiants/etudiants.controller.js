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
exports.listEtudiants = listEtudiants;
exports.getEtudiant = getEtudiant;
exports.searchEtudiants = searchEtudiants;
exports.getEtudiantDocuments = getEtudiantDocuments;
exports.getEtudiantAudit = getEtudiantAudit;
exports.validateEtudiant = validateEtudiant;
exports.rejectEtudiant = rejectEtudiant;
exports.suspendEtudiant = suspendEtudiant;
exports.assignInue = assignInue;
exports.estimateEtudiants = estimateEtudiants;
const dto_1 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const svc = __importStar(require("./etudiants.service"));
const dto_2 = require("./dto");
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
function actorOf(req) {
    return { userId: req.userId, roleName: req.roleName ?? null };
}
function assertCanAccessEtudiant(req, userId) {
    if (userId === req.userId)
        return;
    const permissions = req.permissions || [];
    if (!permissions.includes("etudiant:read"))
        throw new utils_1.ForbiddenError("Accès non autorisé à ce dossier étudiant");
}
async function listEtudiants(req, res) {
    const parsed = dto_2.listEtudiantsQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    const { data, meta } = await svc.listEtudiants(parsed.data);
    res.json((0, dto_1.ok)(data, meta));
}
async function getEtudiant(req, res) {
    assertCanAccessEtudiant(req, req.params.id);
    const etudiant = await svc.getEtudiantDetail(req.params.id);
    res.json((0, dto_1.ok)(etudiant));
}
async function searchEtudiants(req, res) {
    const parsed = dto_2.searchEtudiantsQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Requête invalide", zodDetails(parsed.error));
    const results = await svc.searchEtudiants(parsed.data.q);
    res.json((0, dto_1.ok)(results));
}
async function getEtudiantDocuments(req, res) {
    assertCanAccessEtudiant(req, req.params.id);
    const documents = await svc.getEtudiantDocuments(req.params.id);
    res.json((0, dto_1.ok)(documents));
}
async function getEtudiantAudit(req, res) {
    assertCanAccessEtudiant(req, req.params.id);
    const logs = await svc.getEtudiantAudit(req.params.id);
    res.json((0, dto_1.ok)(logs));
}
async function validateEtudiant(req, res) {
    const parsed = dto_2.validateEtudiantDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const etudiant = await svc.validateEtudiant(req.params.id, parsed.data.comment, actorOf(req));
    res.json((0, dto_1.ok)(etudiant));
}
async function rejectEtudiant(req, res) {
    const parsed = dto_2.rejectEtudiantDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const etudiant = await svc.rejectEtudiant(req.params.id, parsed.data.reason, actorOf(req));
    res.json((0, dto_1.ok)(etudiant));
}
async function suspendEtudiant(req, res) {
    const parsed = dto_2.suspendEtudiantDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const etudiant = await svc.suspendEtudiant(req.params.id, parsed.data.reason, actorOf(req));
    res.json((0, dto_1.ok)(etudiant));
}
async function assignInue(req, res) {
    const etudiant = await svc.assignInueToEtudiant(req.params.id, actorOf(req));
    res.json((0, dto_1.ok)(etudiant));
}
async function estimateEtudiants(req, res) {
    const parsed = dto_2.estimateEtudiantsDto.safeParse(req.body ?? {});
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    const estimate = await svc.estimateEtudiants(parsed.data);
    res.json((0, dto_1.ok)(estimate));
}
//# sourceMappingURL=etudiants.controller.js.map