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
exports.listAgendaSlots = listAgendaSlots;
exports.getAgendaSlot = getAgendaSlot;
exports.listRendezVous = listRendezVous;
exports.createRendezVous = createRendezVous;
exports.createUrgence = createUrgence;
exports.updateStatus = updateStatus;
exports.checkIn = checkIn;
exports.complete = complete;
exports.cancel = cancel;
exports.printDaily = printDaily;
exports.printHistory = printHistory;
exports.reprint = reprint;
exports.listNotes = listNotes;
exports.addNote = addNote;
const svc = __importStar(require("./rendezvous.service"));
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
    return permissions.includes("rdv:read");
}
function isAdmin(req) {
    return req.roleName === "ADMIN";
}
function canReadAllServices(req) {
    return isAdmin(req) || req.roleName === "RECEPTIONIST";
}
async function assertCanAccessRendezVous(req, rendezVousId, write = false) {
    if (hasStaffReadAccess(req)) {
        if (!(write ? isAdmin(req) : canReadAllServices(req))) {
            const { subServiceId } = await svc.getRendezVousAccessInfo(rendezVousId);
            const scope = await (0, enrich_1.getAssignedSubServiceIds)(req.userId);
            if (!scope.includes(subServiceId))
                throw new utils_1.ForbiddenError("Ce service ne vous est pas assigné");
        }
        return true;
    }
    const ownerId = await svc.getRendezVousOwnerId(rendezVousId);
    if (ownerId !== req.userId)
        throw new utils_1.ForbiddenError("Accès non autorisé à ce rendez-vous");
    return false;
}
async function assertServiceScope(req, rendezVousId) {
    if (isAdmin(req))
        return;
    const { subServiceId } = await svc.getRendezVousAccessInfo(rendezVousId);
    const scope = await (0, enrich_1.getAssignedSubServiceIds)(req.userId);
    if (!scope.includes(subServiceId))
        throw new utils_1.ForbiddenError("Ce service ne vous est pas assigné");
}
async function listAgendaSlots(req, res) {
    const parsed = dto_1.agendaSlotsQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.listAgendaSlots(parsed.data)));
}
async function getAgendaSlot(req, res) {
    res.json((0, dto_2.ok)(await svc.getAgendaSlot(req.params.slotId)));
}
async function listRendezVous(req, res) {
    const parsed = dto_1.listRendezVousQueryDto.safeParse(req.query);
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
            res.json((0, dto_2.ok)(await svc.listRendezVous({ ...parsed.data, subServiceIds: scope })));
            return;
        }
    }
    res.json((0, dto_2.ok)(await svc.listRendezVous(parsed.data)));
}
async function createRendezVous(req, res) {
    const parsed = dto_1.createRendezVousDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.status(201).json((0, dto_2.ok)(await svc.createRendezVous(parsed.data, actorOf(req))));
}
async function createUrgence(req, res) {
    const parsed = dto_1.createUrgenceDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.status(201).json((0, dto_2.ok)(await svc.createUrgence(parsed.data, actorOf(req))));
}
async function updateStatus(req, res) {
    const parsed = dto_1.updateStatusDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    await assertServiceScope(req, req.params.id);
    res.json((0, dto_2.ok)(await svc.updateStatus(req.params.id, parsed.data.status, actorOf(req))));
}
async function checkIn(req, res) {
    await assertServiceScope(req, req.params.id);
    res.json((0, dto_2.ok)(await svc.checkIn(req.params.id)));
}
async function complete(req, res) {
    const parsed = dto_1.completeDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    await assertServiceScope(req, req.params.id);
    res.json((0, dto_2.ok)(await svc.completeRendezVous(req.params.id)));
}
async function cancel(req, res) {
    const parsed = dto_1.cancelDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    await assertServiceScope(req, req.params.id);
    res.json((0, dto_2.ok)(await svc.cancelRendezVous(req.params.id, parsed.data.cancelledBy ?? "AGENT")));
}
async function printDaily(req, res) {
    const parsed = dto_1.printDailyDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.status(201).json((0, dto_2.ok)(await svc.printDaily(parsed.data, actorOf(req))));
}
async function printHistory(req, res) {
    const parsed = dto_1.printHistoryQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.printHistory(parsed.data.date)));
}
async function reprint(req, res) {
    res.status(201).json((0, dto_2.ok)(await svc.reprint(req.params.id, actorOf(req))));
}
async function listNotes(req, res) {
    const isStaff = await assertCanAccessRendezVous(req, req.params.id);
    const notes = await svc.listNotes(req.params.id);
    res.json((0, dto_2.ok)(isStaff ? notes : notes.filter((n) => !n.isInternal)));
}
async function addNote(req, res) {
    const parsed = dto_1.addNoteDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const isStaff = await assertCanAccessRendezVous(req, req.params.id, true);
    const note = await svc.addNote(req.params.id, parsed.data.content, parsed.data.isInternal ?? true, actorOf(req), isStaff);
    res.status(201).json((0, dto_2.ok)(note));
}
//# sourceMappingURL=rendezvous.controller.js.map