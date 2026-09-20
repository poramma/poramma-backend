"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTickets = listTickets;
exports.listAssignees = listAssignees;
exports.getTicket = getTicket;
exports.addMessage = addMessage;
exports.updateTicket = updateTicket;
const zod_1 = require("zod");
const dto_1 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const ambassade_core_1 = require("@poramma/ambassade-core");
const connection_1 = require("../../db/connection");
const audit_service_1 = require("../audit/audit.service");
const listQueryDto = zod_1.z.object({
    status: zod_1.z.enum(["ACTIVE", ...ambassade_core_1.supportLogic.TICKET_STATUSES]).optional(),
    category: zod_1.z.enum(ambassade_core_1.supportLogic.TICKET_CATEGORIES).optional(),
    priority: zod_1.z.enum(ambassade_core_1.supportLogic.TICKET_PRIORITIES).optional(),
    assigned: zod_1.z.string().min(1).optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
});
const messageDto = zod_1.z.object({
    content: zod_1.z.string().trim().min(1, "Message vide").max(3000),
    isInternal: zod_1.z.boolean().optional(),
});
const updateDto = zod_1.z
    .object({
    status: zod_1.z.enum(ambassade_core_1.supportLogic.TICKET_STATUSES).optional(),
    priority: zod_1.z.enum(ambassade_core_1.supportLogic.TICKET_PRIORITIES).optional(),
    assignedTo: zod_1.z.string().uuid().nullable().optional(),
})
    .refine((v) => v.status !== undefined || v.priority !== undefined || v.assignedTo !== undefined, { message: "Aucune modification demandée" });
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
const actorOf = (req) => ({ userId: req.userId, roleName: req.roleName ?? null });
async function listTickets(req, res) {
    const parsed = listQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    const { data, total, page, limit, stats } = await ambassade_core_1.supportLogic.listTickets(connection_1.db, actorOf(req).userId, parsed.data);
    const meta = { ...(0, dto_1.paginationMeta)(page, limit, total), stats };
    res.json((0, dto_1.ok)(data, meta));
}
async function listAssignees(_req, res) {
    res.json((0, dto_1.ok)(await ambassade_core_1.supportLogic.listAssignees(connection_1.db)));
}
async function getTicket(req, res) {
    res.json((0, dto_1.ok)(await ambassade_core_1.supportLogic.getTicketForStaff(connection_1.db, req.params.id)));
}
async function addMessage(req, res) {
    const parsed = messageDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const actor = actorOf(req);
    const internal = parsed.data.isInternal ?? false;
    const ticket = await ambassade_core_1.supportLogic.addStaffMessage(connection_1.db, req.params.id, actor.userId, parsed.data.content, internal);
    await (0, audit_service_1.writeAudit)({
        action: internal ? "NOTE" : "COMMENT",
        entityType: "TICKET_SUPPORT",
        entityId: req.params.id,
        actor,
        details: { reference: ticket.reference, internal },
    });
    res.status(201).json((0, dto_1.ok)(ticket, undefined, internal ? "Note interne ajoutée." : "Réponse envoyée à l'usager."));
}
async function updateTicket(req, res) {
    const parsed = updateDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const actor = actorOf(req);
    const before = await ambassade_core_1.supportLogic.getTicketForStaff(connection_1.db, req.params.id);
    const ticket = await ambassade_core_1.supportLogic.updateTicket(connection_1.db, req.params.id, actor.userId, parsed.data);
    await (0, audit_service_1.writeAudit)({
        action: parsed.data.assignedTo !== undefined && parsed.data.status === undefined ? "ASSIGN" : "UPDATE_STATUS",
        entityType: "TICKET_SUPPORT",
        entityId: req.params.id,
        actor,
        severity: parsed.data.status === "CLOSED" ? "WARNING" : "INFO",
        entitySnapshot: {
            from: { status: before.status, priority: before.priority, assignee: before.assignee?.name ?? null },
            to: { status: ticket.status, priority: ticket.priority, assignee: ticket.assignee?.name ?? null },
        },
        details: { reference: ticket.reference },
    });
    res.json((0, dto_1.ok)(ticket));
}
//# sourceMappingURL=support.controller.js.map