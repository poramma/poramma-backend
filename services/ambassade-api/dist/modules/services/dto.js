"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRequirementDto = exports.createRequirementDto = exports.createExceptionDto = exports.updateScheduleDto = exports.createScheduleDto = exports.updateSubServiceDto = exports.createSubServiceDto = exports.updateServiceDto = exports.createServiceDto = void 0;
const zod_1 = require("zod");
exports.createServiceDto = zod_1.z.object({
    name: zod_1.z.string().min(1),
    code: zod_1.z.string().min(1),
    description: zod_1.z.string().nullable().optional(),
    icon: zod_1.z.string().nullable().optional(),
    order: zod_1.z.number().int().optional(),
    active: zod_1.z.boolean().optional(),
    requiresAppointment: zod_1.z.boolean().optional(),
});
exports.updateServiceDto = exports.createServiceDto.partial();
exports.createSubServiceDto = zod_1.z.object({
    serviceId: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    code: zod_1.z.string().min(1),
    description: zod_1.z.string().nullable().optional(),
    active: zod_1.z.boolean().optional(),
    basePrice: zod_1.z.number().nullable().optional(),
    currency: zod_1.z.string().optional(),
    slaDays: zod_1.z.number().int().min(0),
    allowCustomRequest: zod_1.z.boolean().optional(),
    requiresInPerson: zod_1.z.boolean().optional(),
});
exports.updateSubServiceDto = exports.createSubServiceDto.partial().omit({ serviceId: true });
exports.createScheduleDto = zod_1.z.object({
    dayOfWeek: zod_1.z.number().int().min(1).max(7),
    startTime: zod_1.z.string(),
    endTime: zod_1.z.string(),
    slotDurationMinutes: zod_1.z.number().int().min(1).optional(),
    maxConcurrentSlots: zod_1.z.number().int().min(1).optional(),
    isActive: zod_1.z.boolean().optional(),
    validFrom: zod_1.z.string().optional(),
    validUntil: zod_1.z.string().nullable().optional(),
});
exports.updateScheduleDto = exports.createScheduleDto.partial();
exports.createExceptionDto = zod_1.z.object({
    date: zod_1.z.string(),
    type: zod_1.z.enum(["CLOSED", "SPECIAL_HOURS", "EXTRA_CAPACITY"]),
    startTime: zod_1.z.string().nullable().optional(),
    endTime: zod_1.z.string().nullable().optional(),
    reason: zod_1.z.string().min(1),
});
exports.createRequirementDto = zod_1.z.object({
    type: zod_1.z.enum(["DOCUMENT", "FIELD", "FEE", "PHOTO", "SIGNATURE"]),
    label: zod_1.z.string().min(1),
    key: zod_1.z.string().min(1),
    description: zod_1.z.string().nullable().optional(),
    required: zod_1.z.boolean().optional(),
    order: zod_1.z.number().int().optional(),
    schema: zod_1.z.record(zod_1.z.unknown()).nullable().optional(),
});
exports.updateRequirementDto = exports.createRequirementDto.partial();
//# sourceMappingURL=dto.js.map