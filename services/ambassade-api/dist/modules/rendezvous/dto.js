"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addNoteDto = exports.printHistoryQueryDto = exports.printDailyDto = exports.cancelDto = exports.completeDto = exports.updateStatusDto = exports.createUrgenceDto = exports.createRendezVousDto = exports.listRendezVousQueryDto = exports.agendaSlotsQueryDto = void 0;
const zod_1 = require("zod");
const rdvStatus = zod_1.z.enum([
    "PENDING",
    "CONFIRMED",
    "CHECKED_IN",
    "IN_PROGRESS",
    "COMPLETED",
    "MISSED",
    "CANCELLED_BY_USER",
    "CANCELLED_BY_AGENT",
    "NO_SHOW",
]);
const rdvType = zod_1.z.enum(["STANDARD", "URGENCE", "PRIORITAIRE", "SUIVI"]);
exports.agendaSlotsQueryDto = zod_1.z.object({
    date: zod_1.z.string(),
    subServiceId: zod_1.z.string().optional(),
    agentId: zod_1.z.string().uuid().optional(),
});
exports.listRendezVousQueryDto = zod_1.z.object({
    date: zod_1.z.string().optional(),
    agentId: zod_1.z.string().uuid().optional(),
    subServiceId: zod_1.z.string().optional(),
    status: rdvStatus.optional(),
    type: rdvType.optional(),
    userId: zod_1.z.string().uuid().optional(),
    fromDate: zod_1.z.string().optional(),
    toDate: zod_1.z.string().optional(),
});
exports.createRendezVousDto = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    subServiceId: zod_1.z.string().min(1),
    agentId: zod_1.z.string().uuid().optional(),
    slotId: zod_1.z.string().min(1),
    motif: zod_1.z.string().nullable().optional(),
    demandeId: zod_1.z.string().nullable().optional(),
});
exports.createUrgenceDto = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    subServiceId: zod_1.z.string().min(1),
    agentId: zod_1.z.string().uuid(),
    motif: zod_1.z.string().min(1),
    urgenceJustification: zod_1.z.string().min(1),
    demandeId: zod_1.z.string().nullable().optional(),
});
exports.updateStatusDto = zod_1.z.object({
    status: rdvStatus,
    comment: zod_1.z.string().optional(),
});
exports.completeDto = zod_1.z.object({
    notes: zod_1.z.string().optional(),
});
exports.cancelDto = zod_1.z.object({
    reason: zod_1.z.string().min(1),
    cancelledBy: zod_1.z.enum(["USER", "AGENT"]).optional(),
});
exports.printDailyDto = zod_1.z.object({
    date: zod_1.z.string(),
    agentId: zod_1.z.string().uuid().nullable().optional(),
    subServiceId: zod_1.z.string().nullable().optional(),
    format: zod_1.z.enum(["PDF", "THERMAL"]).default("PDF"),
});
exports.printHistoryQueryDto = zod_1.z.object({
    date: zod_1.z.string(),
});
exports.addNoteDto = zod_1.z.object({
    content: zod_1.z.string().min(1),
    isInternal: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=dto.js.map