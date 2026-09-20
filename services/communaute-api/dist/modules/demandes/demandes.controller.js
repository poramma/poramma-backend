"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMyDemandes = listMyDemandes;
exports.getDemande = getDemande;
exports.createDemande = createDemande;
exports.listHistory = listHistory;
exports.listComments = listComments;
exports.addComment = addComment;
exports.listRequirements = listRequirements;
exports.listDemandeDocuments = listDemandeDocuments;
const ambassade_core_1 = require("@poramma/ambassade-core");
const dto_1 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const connection_1 = require("../../db/connection");
const public_mappers_1 = require("../../shared/public-mappers");
const sanitize_1 = require("../../shared/sanitize");
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
const userIdOf = (req) => req.userId;
async function publicDemande(row) {
    const sub = await ambassade_core_1.servicesLogic.getSubServiceShallow(connection_1.db, row.subServiceId);
    const advisor = sub?.service?.isCultural ? await ambassade_core_1.cultureLogic.advisorByAgentId(connection_1.db, row.assignedAgentId) : null;
    return (0, public_mappers_1.toPublicDemande)(row, sub, advisor);
}
async function isCulturalDemande(row) {
    const sub = await ambassade_core_1.servicesLogic.getSubServiceShallow(connection_1.db, row.subServiceId);
    return sub?.service?.isCultural === true;
}
async function listMyDemandes(req, res) {
    const rows = await ambassade_core_1.demandesLogic.listDemandesByUser(connection_1.db, userIdOf(req));
    res.json((0, dto_1.ok)(await Promise.all(rows.map(publicDemande))));
}
async function getDemande(req, res) {
    const row = await ambassade_core_1.demandesLogic.getOwnedDemande(connection_1.db, req.params.id, userIdOf(req));
    res.json((0, dto_1.ok)(await publicDemande(row)));
}
async function createDemande(req, res) {
    const parsed = dto_1.communityDemandesDto.createDemandeDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const row = await ambassade_core_1.demandesLogic.createDemande(connection_1.db, {
        userId: userIdOf(req),
        subServiceId: parsed.data.subServiceId,
        customPayload: parsed.data.customPayload ? (0, sanitize_1.sanitizeDeep)(parsed.data.customPayload) : null,
        documents: parsed.data.documents,
        enforceRequiredDocuments: true,
    });
    res.status(201).json((0, dto_1.ok)(await publicDemande(row)));
}
async function listHistory(req, res) {
    await ambassade_core_1.demandesLogic.getOwnedDemande(connection_1.db, req.params.id, userIdOf(req));
    const history = await ambassade_core_1.demandesLogic.listHistory(connection_1.db, req.params.id);
    res.json((0, dto_1.ok)(history.filter((h) => h.isVisibleToUser).map(public_mappers_1.toPublicHistory)));
}
async function listComments(req, res) {
    const demande = await ambassade_core_1.demandesLogic.getOwnedDemande(connection_1.db, req.params.id, userIdOf(req));
    const reveal = await isCulturalDemande(demande);
    const comments = await ambassade_core_1.demandesLogic.listComments(connection_1.db, req.params.id);
    res.json((0, dto_1.ok)(comments.filter((c) => !c.isInternal).map((c) => (0, public_mappers_1.toPublicComment)(c, reveal))));
}
async function addComment(req, res) {
    const parsed = dto_1.communityDemandesDto.addCommentDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const content = (0, sanitize_1.sanitizeText)(parsed.data.content);
    if (!content)
        throw new utils_1.ValidationError("Données invalides", { content: ["Message vide"] });
    await ambassade_core_1.demandesLogic.getOwnedDemande(connection_1.db, req.params.id, userIdOf(req));
    const comment = await ambassade_core_1.demandesLogic.addComment(connection_1.db, req.params.id, content, false, { userId: userIdOf(req), roleName: null }, false);
    res.status(201).json((0, dto_1.ok)((0, public_mappers_1.toPublicComment)(comment)));
}
async function listRequirements(req, res) {
    await ambassade_core_1.demandesLogic.getOwnedDemande(connection_1.db, req.params.id, userIdOf(req));
    const reqs = await ambassade_core_1.demandesLogic.listRequirements(connection_1.db, req.params.id);
    res.json((0, dto_1.ok)(reqs.map(public_mappers_1.toPublicRequirement)));
}
async function listDemandeDocuments(req, res) {
    await ambassade_core_1.demandesLogic.getOwnedDemande(connection_1.db, req.params.id, userIdOf(req));
    const docs = await ambassade_core_1.demandesLogic.listDemandeDocuments(connection_1.db, req.params.id);
    res.json((0, dto_1.ok)(docs.map(public_mappers_1.toPublicDemandeDocument)));
}
//# sourceMappingURL=demandes.controller.js.map