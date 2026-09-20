"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleCampagneDto = exports.reorderAttachmentsDto = exports.updateAttachmentDto = exports.uploadAttachmentDto = exports.estimateRecipientsDto = exports.listCampagnesQueryDto = exports.updateCampagneDto = exports.createCampagneDto = void 0;
const zod_1 = require("zod");
const targetFiltersSchema = zod_1.z.object({
    cities: zod_1.z.array(zod_1.z.string()).optional(),
    statuses: zod_1.z.array(zod_1.z.string()).optional(),
    studyLevels: zod_1.z.array(zod_1.z.string()).optional(),
    faculties: zod_1.z.array(zod_1.z.string()).optional(),
    hasBourse: zod_1.z.boolean().optional(),
    universities: zod_1.z.array(zod_1.z.string()).optional(),
    userIds: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.createCampagneDto = zod_1.z.object({
    title: zod_1.z.string().min(1),
    content: zod_1.z.string().min(1),
    type: zod_1.z.enum(["INFO", "ALERT", "EVENT", "SURVEY", "REMINDER"]),
    coverImageFileId: zod_1.z.string().optional(),
    targetFilters: targetFiltersSchema.default({}),
    scheduledAt: zod_1.z.string().datetime().optional(),
    channels: zod_1.z.array(zod_1.z.enum(["IN_APP", "EMAIL", "SMS", "PUSH", "WHATSAPP"])).default(["IN_APP"]),
});
exports.updateCampagneDto = exports.createCampagneDto.partial();
exports.listCampagnesQueryDto = zod_1.z.object({
    status: zod_1.z.enum(["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED", "CANCELLED"]).optional(),
    type: zod_1.z.enum(["INFO", "ALERT", "EVENT", "SURVEY", "REMINDER"]).optional(),
});
exports.estimateRecipientsDto = targetFiltersSchema;
const booleanish = zod_1.z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), zod_1.z.boolean());
exports.uploadAttachmentDto = zod_1.z.object({
    type: zod_1.z.enum(["IMAGE", "VIDEO", "DOCUMENT"]),
    caption: zod_1.z.string().optional(),
    isBanner: booleanish.optional(),
});
exports.updateAttachmentDto = zod_1.z
    .object({
    isBanner: zod_1.z.boolean().optional(),
    caption: zod_1.z.string().max(300).nullable().optional(),
})
    .refine((v) => v.isBanner !== undefined || v.caption !== undefined, { message: "Aucune modification demandée" });
exports.reorderAttachmentsDto = zod_1.z.object({
    orderedAttachmentIds: zod_1.z.array(zod_1.z.string()).min(1),
});
exports.scheduleCampagneDto = zod_1.z.object({
    scheduledAt: zod_1.z.string().datetime(),
});
//# sourceMappingURL=dto.js.map