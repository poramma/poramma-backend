"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileStatus = getProfileStatus;
exports.getRegistration = getRegistration;
exports.submitRegistration = submitRegistration;
const ambassade_core_1 = require("@poramma/ambassade-core");
const dto_1 = require("@poramma/dto");
const connection_1 = require("../../db/connection");
const userIdOf = (req) => req.userId;
async function getProfileStatus(req, res) {
    const status = await ambassade_core_1.etudiantsLogic.getRegistrationStatus(connection_1.db, userIdOf(req));
    res.json((0, dto_1.ok)(status));
}
async function getRegistration(req, res) {
    res.json((0, dto_1.ok)(await ambassade_core_1.registrationLogic.getRegistrationChecklist(connection_1.db, userIdOf(req))));
}
async function submitRegistration(req, res) {
    const checklist = await ambassade_core_1.registrationLogic.submitRegistration(connection_1.db, userIdOf(req));
    res.json((0, dto_1.ok)(checklist, undefined, "Votre dossier d'enregistrement a bien été reçu par l'ambassade."));
}
//# sourceMappingURL=profile.controller.js.map