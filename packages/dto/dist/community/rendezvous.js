"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRendezVousNoteDto = exports.cancelRendezVousDto = exports.rescheduleRendezVousDto = exports.bookRendezVousDto = exports.availableDatesQueryDto = exports.slotsQueryDto = void 0;
const zod_1 = require("zod");
const dateStr = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : AAAA-MM-JJ");
const timeStr = zod_1.z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format attendu : HH:MM");
exports.slotsQueryDto = zod_1.z.object({ subServiceId: zod_1.z.string().min(1), date: dateStr });
exports.availableDatesQueryDto = zod_1.z.object({
    subServiceId: zod_1.z.string().min(1),
    days: zod_1.z.coerce.number().int().min(1).max(60).optional(),
});
exports.bookRendezVousDto = zod_1.z.object({
    subServiceId: zod_1.z.string().min(1),
    date: dateStr,
    startTime: timeStr,
    motif: zod_1.z.string().max(500).nullable().optional(),
    demandeId: zod_1.z.string().min(1).nullable().optional(),
});
exports.rescheduleRendezVousDto = zod_1.z.object({
    date: dateStr,
    startTime: timeStr,
});
exports.cancelRendezVousDto = zod_1.z.object({
    reason: zod_1.z.string().max(500).nullable().optional(),
});
exports.addRendezVousNoteDto = zod_1.z.object({
    content: zod_1.z.string().min(1).max(1000),
});
//# sourceMappingURL=rendezvous.js.map