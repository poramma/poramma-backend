"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExceptionDto = exports.updateAvailabilityDto = exports.createAvailabilityDto = exports.updateAssignmentDto = exports.createAssignmentDto = void 0;
const zod_1 = require("zod");
exports.createAssignmentDto = zod_1.z.object({
    subServiceId: zod_1.z.string().min(1),
    validFrom: zod_1.z.string().nullable().optional(),
    validUntil: zod_1.z.string().nullable().optional(),
    isPrimary: zod_1.z.boolean().optional(),
    maxDailyAppointments: zod_1.z.number().int().min(0).nullable().optional(),
    notes: zod_1.z.string().nullable().optional(),
});
exports.updateAssignmentDto = exports.createAssignmentDto.partial().extend({
    active: zod_1.z.boolean().optional(),
});
exports.createAvailabilityDto = zod_1.z.object({
    dayOfWeek: zod_1.z.number().int().min(1).max(7),
    startTime: zod_1.z.string().nullable().optional(),
    endTime: zod_1.z.string().nullable().optional(),
    isAvailable: zod_1.z.boolean().optional(),
    validFrom: zod_1.z.string().nullable().optional(),
    validUntil: zod_1.z.string().nullable().optional(),
});
exports.updateAvailabilityDto = exports.createAvailabilityDto.partial();
exports.createExceptionDto = zod_1.z.object({
    date: zod_1.z.string(),
    type: zod_1.z.enum(["ABSENCE", "TRAINING", "HOLIDAY", "MISSION", "OTHER"]),
    reason: zod_1.z.string().min(1),
    isFullDay: zod_1.z.boolean().optional(),
    startTime: zod_1.z.string().nullable().optional(),
    endTime: zod_1.z.string().nullable().optional(),
});
//# sourceMappingURL=dto.js.map