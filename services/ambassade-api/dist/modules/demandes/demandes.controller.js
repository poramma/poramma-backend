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
exports.listDemandes = listDemandes;
exports.getDemande = getDemande;
exports.createDemande = createDemande;
exports.updateStatus = updateStatus;
exports.assignAgent = assignAgent;
exports.listHistory = listHistory;
exports.listComments = listComments;
exports.addComment = addComment;
exports.listRequirements = listRequirements;
exports.listDemandeDocuments = listDemandeDocuments;
exports.validateRequirement = validateRequirement;
const svc = __importStar(require("./demandes.service"));
const dto_1 = require("./dto");
const dto_2 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const enrich_1 = require("../../shared/enrich");
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
function actorOf(req) {
    return { userId: req.userId, roleName: req.roleName };
}
function hasStaffReadAccess(req) {
    const permissions = req.permissions || [];
    return permissions.includes("demande:read");
}
function isAdmin(req) {
    return req.roleName === "ADMIN";
}
function canReadAllServices(req) {
    return isAdmin(req) || req.roleName === "RECEPTIONIST";
}
async function assertCanAccessDemande(req, demandeId, write = false) {
    if (hasStaffReadAccess(req)) {
        if (!(write ? isAdmin(req) : canReadAllServices(req))) {
            const { subServiceId } = await svc.getDemandeAccessInfo(demandeId);
            const scope = await (0, enrich_1.getAssignedSubServiceIds)(req.userId);
            if (!scope.includes(subServiceId))
                throw new utils_1.ForbiddenError("Ce service ne vous est pas assigné");
        }
        return true;
    }
    const { userId: ownerId } = await svc.getDemandeAccessInfo(demandeId);
    if (ownerId !== req.userId)
        throw new utils_1.ForbiddenError("Accès non autorisé à cette demande");
    return false;
}
async function listDemandes(req, res) {
    const parsed = dto_1.listDemandesQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    if (!canReadAllServices(req)) {
        const scope = await (0, enrich_1.getAssignedSubServiceIds)(req.userId);
        if (parsed.data.subServiceId) {
            if (!scope.includes(parsed.data.subServiceId))
                return res.json((0, dto_2.ok)([]));
        }
        else if (scope.length === 0) {
            return res.json((0, dto_2.ok)([]));
        }
        else {
            res.json((0, dto_2.ok)(await svc.listDemandes({ ...parsed.data, subServiceIds: scope })));
            return;
        }
    }
    res.json((0, dto_2.ok)(await svc.listDemandes(parsed.data)));
}
async function getDemande(req, res) {
    await assertCanAccessDemande(req, req.params.id);
    res.json((0, dto_2.ok)(await svc.getDemande(req.params.id)));
}
async function createDemande(req, res) {
    const parsed = dto_1.createDemandeDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.status(201).json((0, dto_2.ok)(await svc.createDemande(parsed.data)));
}
async function assertServiceScope(req, demandeId) {
    if (isAdmin(req))
        return;
    const { subServiceId } = await svc.getDemandeAccessInfo(demandeId);
    const scope = await (0, enrich_1.getAssignedSubServiceIds)(req.userId);
    if (!scope.includes(subServiceId))
        throw new utils_1.ForbiddenError("Ce service ne vous est pas assigné");
}
async function updateStatus(req, res) {
    const parsed = dto_1.updateStatusDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const permissions = req.permissions || [];
    const requiredPermission = parsed.data.status === "APPROVED" ? "demande:validate" : parsed.data.status === "REJECTED" ? "demande:reject" : "demande:update";
    if (!permissions.includes(requiredPermission))
        throw new utils_1.ForbiddenError("Permission insuffisante");
    await assertServiceScope(req, req.params.id);
    res.json((0, dto_2.ok)(await svc.updateStatus(req.params.id, parsed.data, actorOf(req))));
}
async function assignAgent(req, res) {
    const parsed = dto_1.assignDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    await assertServiceScope(req, req.params.id);
    res.json((0, dto_2.ok)(await svc.assignAgent(req.params.id, parsed.data, actorOf(req))));
}
async function listHistory(req, res) {
    const isStaff = await assertCanAccessDemande(req, req.params.id);
    const history = await svc.listHistory(req.params.id);
    res.json((0, dto_2.ok)(isStaff ? history : history.filter((h) => h.isVisibleToUser)));
}
async function listComments(req, res) {
    const isStaff = await assertCanAccessDemande(req, req.params.id);
    const comments = await svc.listComments(req.params.id);
    res.json((0, dto_2.ok)(isStaff ? comments : comments.filter((c) => !c.isInternal)));
}
async function addComment(req, res) {
    const parsed = dto_1.addCommentDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const isStaff = await assertCanAccessDemande(req, req.params.id, true);
    const comment = await svc.addComment(req.params.id, parsed.data.content, parsed.data.isInternal ?? true, actorOf(req), isStaff);
    res.status(201).json((0, dto_2.ok)(comment));
}
async function listRequirements(req, res) {
    await assertCanAccessDemande(req, req.params.id);
    res.json((0, dto_2.ok)(await svc.listRequirements(req.params.id)));
}
async function listDemandeDocuments(req, res) {
    await assertCanAccessDemande(req, req.params.id);
    res.json((0, dto_2.ok)(await svc.listDemandeDocuments(req.params.id)));
}
async function validateRequirement(req, res) {
    const parsed = dto_1.validateRequirementDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.validateRequirement(req.params.requirementId, parsed.data.status, parsed.data.note, actorOf(req))));
}
//# sourceMappingURL=demandes.controller.js.map