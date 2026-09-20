"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSlots = listSlots;
exports.listAvailableDates = listAvailableDates;
exports.listMine = listMine;
exports.getOne = getOne;
exports.book = book;
exports.reschedule = reschedule;
exports.cancel = cancel;
exports.listNotes = listNotes;
exports.addNote = addNote;
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
const ipOf = (req) => req.ip ?? null;
async function listSlots(req, res) {
    const parsed = dto_1.communityRendezVousDto.slotsQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Paramètres invalides", zodDetails(parsed.error));
    res.json((0, dto_1.ok)(await ambassade_core_1.rendezvousLogic.listPublicSlots(connection_1.db, parsed.data)));
}
async function listAvailableDates(req, res) {
    const parsed = dto_1.communityRendezVousDto.availableDatesQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Paramètres invalides", zodDetails(parsed.error));
    res.json((0, dto_1.ok)(await ambassade_core_1.rendezvousLogic.listAvailableDates(connection_1.db, parsed.data)));
}
async function listMine(req, res) {
    const items = await ambassade_core_1.rendezvousLogic.listByUser(connection_1.db, userIdOf(req));
    res.json((0, dto_1.ok)(items.map(public_mappers_1.toPublicRendezVous)));
}
async function getOne(req, res) {
    res.json((0, dto_1.ok)((0, public_mappers_1.toPublicRendezVous)(await ambassade_core_1.rendezvousLogic.getOwned(connection_1.db, userIdOf(req), req.params.id))));
}
async function book(req, res) {
    const parsed = dto_1.communityRendezVousDto.bookRendezVousDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const row = await ambassade_core_1.rendezvousLogic.bookForUser(connection_1.db, {
        userId: userIdOf(req),
        subServiceId: parsed.data.subServiceId,
        date: parsed.data.date,
        startTime: parsed.data.startTime,
        motif: parsed.data.motif ? (0, sanitize_1.sanitizeText)(parsed.data.motif) : null,
        demandeId: parsed.data.demandeId ?? null,
        ip: ipOf(req),
    });
    const item = await ambassade_core_1.rendezvousLogic.getOwned(connection_1.db, userIdOf(req), row.id);
    res.status(201).json((0, dto_1.ok)((0, public_mappers_1.toPublicRendezVous)(item), undefined, "Votre rendez-vous est enregistré. L'ambassade le confirmera prochainement."));
}
async function reschedule(req, res) {
    const parsed = dto_1.communityRendezVousDto.rescheduleRendezVousDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const item = await ambassade_core_1.rendezvousLogic.rescheduleByUser(connection_1.db, { userId: userIdOf(req), id: req.params.id, ...parsed.data, ip: ipOf(req) });
    res.json((0, dto_1.ok)((0, public_mappers_1.toPublicRendezVous)(item), undefined, "Votre rendez-vous a été déplacé. L'ambassade le confirmera à nouveau."));
}
async function cancel(req, res) {
    const parsed = dto_1.communityRendezVousDto.cancelRendezVousDto.safeParse(req.body ?? {});
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const item = await ambassade_core_1.rendezvousLogic.cancelByUser(connection_1.db, {
        userId: userIdOf(req),
        id: req.params.id,
        reason: parsed.data.reason ? (0, sanitize_1.sanitizeText)(parsed.data.reason) : null,
        ip: ipOf(req),
    });
    res.json((0, dto_1.ok)((0, public_mappers_1.toPublicRendezVous)(item), undefined, "Votre rendez-vous a été annulé."));
}
async function listNotes(req, res) {
    const item = await ambassade_core_1.rendezvousLogic.getOwned(connection_1.db, userIdOf(req), req.params.id);
    const notes = await ambassade_core_1.rendezvousLogic.listNotesForUser(connection_1.db, userIdOf(req), req.params.id);
    res.json((0, dto_1.ok)(notes.map((n) => (0, public_mappers_1.toPublicComment)(n, !!item.advisor))));
}
async function addNote(req, res) {
    const parsed = dto_1.communityRendezVousDto.addRendezVousNoteDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const note = await ambassade_core_1.rendezvousLogic.addNoteByUser(connection_1.db, {
        userId: userIdOf(req),
        id: req.params.id,
        content: (0, sanitize_1.sanitizeText)(parsed.data.content),
        ip: ipOf(req),
    });
    res.status(201).json((0, dto_1.ok)((0, public_mappers_1.toPublicComment)(note)));
}
//# sourceMappingURL=rendezvous.controller.js.map