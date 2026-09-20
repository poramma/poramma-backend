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
exports.listAssignments = listAssignments;
exports.createAssignment = createAssignment;
exports.updateAssignment = updateAssignment;
exports.deleteAssignment = deleteAssignment;
exports.listAvailabilities = listAvailabilities;
exports.createAvailability = createAvailability;
exports.updateAvailability = updateAvailability;
exports.deleteAvailability = deleteAvailability;
exports.listExceptions = listExceptions;
exports.createException = createException;
exports.deleteException = deleteException;
const svc = __importStar(require("./agent-schedule.service"));
const dto_1 = require("./dto");
const dto_2 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const schema_identity_readonly_1 = require("../../db/schema.identity-readonly");
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
async function assertCanManageAgentSchedule(req, targetAgentId) {
    const permissions = req.permissions || [];
    if (permissions.includes("availability:config"))
        return;
    const callerUserId = req.userId;
    const targetUserId = await (0, schema_identity_readonly_1.getAgentUserId)(targetAgentId);
    if (targetUserId !== callerUserId)
        throw new utils_1.ForbiddenError("Vous ne pouvez gérer que votre propre planning");
}
async function listAssignments(req, res) {
    res.json((0, dto_2.ok)(await svc.listAssignments(req.params.id)));
}
async function createAssignment(req, res) {
    const parsed = dto_1.createAssignmentDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const assignedBy = req.userId;
    res.status(201).json((0, dto_2.ok)(await svc.createAssignment(req.params.id, parsed.data, assignedBy)));
}
async function updateAssignment(req, res) {
    const parsed = dto_1.updateAssignmentDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.updateAssignment(req.params.assignmentId, parsed.data)));
}
async function deleteAssignment(req, res) {
    await svc.deleteAssignment(req.params.assignmentId);
    res.status(204).send();
}
async function listAvailabilities(req, res) {
    res.json((0, dto_2.ok)(await svc.listAvailabilities(req.params.id, req.query.date)));
}
async function createAvailability(req, res) {
    const parsed = dto_1.createAvailabilityDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    await assertCanManageAgentSchedule(req, req.params.id);
    res.status(201).json((0, dto_2.ok)(await svc.createAvailability(req.params.id, parsed.data)));
}
async function updateAvailability(req, res) {
    const parsed = dto_1.updateAvailabilityDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    await assertCanManageAgentSchedule(req, req.params.id);
    res.json((0, dto_2.ok)(await svc.updateAvailability(req.params.availId, parsed.data)));
}
async function deleteAvailability(req, res) {
    await assertCanManageAgentSchedule(req, req.params.id);
    await svc.deleteAvailability(req.params.availId);
    res.status(204).send();
}
async function listExceptions(req, res) {
    res.json((0, dto_2.ok)(await svc.listExceptions(req.params.id, req.query.date, req.query.from)));
}
async function createException(req, res) {
    const parsed = dto_1.createExceptionDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    await assertCanManageAgentSchedule(req, req.params.id);
    const createdBy = req.userId;
    res.status(201).json((0, dto_2.ok)(await svc.createException(req.params.id, parsed.data, createdBy)));
}
async function deleteException(req, res) {
    await assertCanManageAgentSchedule(req, req.params.id);
    await svc.deleteException(req.params.excId);
    res.status(204).send();
}
//# sourceMappingURL=agent-schedule.controller.js.map