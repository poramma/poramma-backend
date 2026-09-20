"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activitiesQueryDto = exports.updatePasswordDto = exports.updatePreferencesDto = exports.updateOwnProfileDto = void 0;
const zod_1 = require("zod");
exports.updateOwnProfileDto = zod_1.z.object({
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
    dateOfBirth: zod_1.z.string().nullable().optional(),
    nationality: zod_1.z.string().nullable().optional(),
    address: zod_1.z.string().nullable().optional(),
    city: zod_1.z.string().nullable().optional(),
    country: zod_1.z.string().nullable().optional(),
});
exports.updatePreferencesDto = zod_1.z.object({
    theme: zod_1.z.enum(["light", "dark", "system"]).optional(),
    language: zod_1.z.enum(["fr", "bm"]).optional(),
    notificationsEmail: zod_1.z.boolean().optional(),
    notificationsInApp: zod_1.z.boolean().optional(),
    notificationTypes: zod_1.z
        .object({
        demandeAssigned: zod_1.z.boolean().optional(),
        documentPending: zod_1.z.boolean().optional(),
        rendezVousReminder: zod_1.z.boolean().optional(),
    })
        .optional(),
});
exports.updatePasswordDto = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8),
});
exports.activitiesQueryDto = zod_1.z.object({
    offset: zod_1.z.coerce.number().int().min(0).default(0),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
//# sourceMappingURL=dto.js.map