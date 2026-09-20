"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTicket = createTicket;
exports.listMyTickets = listMyTickets;
exports.getMyTicket = getMyTicket;
exports.replyToMyTicket = replyToMyTicket;
exports.resolveMyTicket = resolveMyTicket;
const dto_1 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const ambassade_core_1 = require("@poramma/ambassade-core");
const connection_1 = require("../../db/connection");
const sanitize_1 = require("../../shared/sanitize");
function parseTicketBody(body) {
    const errors = {};
    const category = typeof body?.category === "string" ? body.category : "";
    const subject = typeof body?.subject === "string" ? (0, sanitize_1.sanitizeText)(body.subject) : "";
    const message = typeof body?.message === "string" ? (0, sanitize_1.sanitizeText)(body.message) : "";
    const reference = typeof body?.reference === "string" ? (0, sanitize_1.sanitizeText)(body.reference) : "";
    if (!ambassade_core_1.supportLogic.TICKET_CATEGORIES.includes(category))
        errors.category = ["Choisissez la nature de votre demande"];
    if (subject.length < 3 || subject.length > 150)
        errors.subject = ["L'objet doit contenir entre 3 et 150 caractères"];
    if (message.length < 10 || message.length > 3000)
        errors.message = ["Décrivez votre demande en quelques phrases (10 à 3000 caractères)"];
    if (reference.length > 60)
        errors.reference = ["Référence trop longue"];
    if (Object.keys(errors).length)
        throw new utils_1.ValidationError("Données invalides", errors);
    return { category, subject, message, linkedReference: reference || null };
}
function parseMessage(body) {
    const content = typeof body?.content === "string" ? (0, sanitize_1.sanitizeText)(body.content) : "";
    if (content.length < 1 || content.length > 3000)
        throw new utils_1.ValidationError("Données invalides", { content: ["Le message doit contenir entre 1 et 3000 caractères"] });
    return content;
}
const userIdOf = (req) => req.userId;
async function createTicket(req, res) {
    const ticket = await ambassade_core_1.supportLogic.createTicket(connection_1.db, userIdOf(req), parseTicketBody(req.body));
    res.status(201).json((0, dto_1.ok)({ id: ticket.id, ticket: ticket.reference }, undefined, "Votre message a été transmis à l'ambassade."));
}
async function listMyTickets(req, res) {
    res.json((0, dto_1.ok)(await ambassade_core_1.supportLogic.listTicketsForUser(connection_1.db, userIdOf(req))));
}
async function getMyTicket(req, res) {
    res.json((0, dto_1.ok)(await ambassade_core_1.supportLogic.getTicketForUser(connection_1.db, userIdOf(req), req.params.id)));
}
async function replyToMyTicket(req, res) {
    res.status(201).json((0, dto_1.ok)(await ambassade_core_1.supportLogic.addUserMessage(connection_1.db, userIdOf(req), req.params.id, parseMessage(req.body))));
}
async function resolveMyTicket(req, res) {
    res.json((0, dto_1.ok)(await ambassade_core_1.supportLogic.resolveByUser(connection_1.db, userIdOf(req), req.params.id)));
}
//# sourceMappingURL=support.controller.js.map