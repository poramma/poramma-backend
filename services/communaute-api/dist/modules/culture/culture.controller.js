"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overview = overview;
exports.createThread = createThread;
exports.listMyThreads = listMyThreads;
exports.getMyThread = getMyThread;
exports.replyToMyThread = replyToMyThread;
const dto_1 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const ambassade_core_1 = require("@poramma/ambassade-core");
const connection_1 = require("../../db/connection");
const public_mappers_1 = require("../../shared/public-mappers");
const sanitize_1 = require("../../shared/sanitize");
function parseThreadBody(body) {
    const errors = {};
    const subject = typeof body?.subject === "string" ? (0, sanitize_1.sanitizeText)(body.subject) : "";
    const message = typeof body?.message === "string" ? (0, sanitize_1.sanitizeText)(body.message) : "";
    if (subject.length < 3 || subject.length > 150)
        errors.subject = ["L'objet doit contenir entre 3 et 150 caractères"];
    if (message.length < 10 || message.length > 3000)
        errors.message = ["Écrivez votre message en quelques phrases (10 à 3000 caractères)"];
    if (Object.keys(errors).length)
        throw new utils_1.ValidationError("Données invalides", errors);
    return { subject, message };
}
function parseMessage(body) {
    const content = typeof body?.content === "string" ? (0, sanitize_1.sanitizeText)(body.content) : "";
    if (content.length < 1 || content.length > 3000)
        throw new utils_1.ValidationError("Données invalides", { content: ["Le message doit contenir entre 1 et 3000 caractères"] });
    return content;
}
const userIdOf = (req) => req.userId;
async function overview(_req, res) {
    const [advisors, all] = await Promise.all([ambassade_core_1.cultureLogic.listAdvisors(connection_1.db), ambassade_core_1.servicesLogic.listServices(connection_1.db)]);
    const cultural = all.filter((s) => s.isCultural && s.active);
    res.json((0, dto_1.ok)({
        advisors: advisors.map(public_mappers_1.toPublicAdvisor),
        services: cultural.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            subServices: (s.subServices ?? [])
                .filter((sub) => sub.active)
                .map((sub) => ({
                id: sub.id,
                name: sub.name,
                description: sub.description,
                slaDays: sub.slaDays,
                schedules: (sub.schedules ?? []).map((h) => ({ dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isActive: h.isActive })),
                kind: sub.requiresInPerson ? "RENDEZ_VOUS" : "DEMANDE",
            })),
        })),
    }));
}
async function createThread(req, res) {
    const thread = await ambassade_core_1.cultureLogic.createThread(connection_1.db, userIdOf(req), parseThreadBody(req.body));
    res.status(201).json((0, dto_1.ok)(thread, undefined, "Votre message a été transmis au Conseiller Culturel."));
}
async function listMyThreads(req, res) {
    res.json((0, dto_1.ok)(await ambassade_core_1.cultureLogic.listThreadsForUser(connection_1.db, userIdOf(req))));
}
async function getMyThread(req, res) {
    res.json((0, dto_1.ok)(await ambassade_core_1.cultureLogic.getThreadForUser(connection_1.db, userIdOf(req), req.params.id)));
}
async function replyToMyThread(req, res) {
    res.status(201).json((0, dto_1.ok)(await ambassade_core_1.cultureLogic.addUserMessage(connection_1.db, userIdOf(req), req.params.id, parseMessage(req.body))));
}
//# sourceMappingURL=culture.controller.js.map