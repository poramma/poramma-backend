"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditQueryDto = exports.validateDocumentDto = exports.uploadDocumentDto = exports.listDocumentsQueryDto = exports.updateCategoryDto = exports.createCategoryDto = void 0;
const zod_1 = require("zod");
const docType = zod_1.z.enum([
    "ID_CARD",
    "PASSPORT",
    "STUDENT_CERT",
    "CONSULAR_CARD",
    "STUDENT_CARD",
    "PHOTO",
    "PROOF_ADDRESS",
    "BIRTH_CERT",
    "NATIONALITY_CERT",
    "SCHOLARSHIP_PROOF",
    "OTHER",
]);
const docStatus = zod_1.z.enum(["UPLOADED", "IN_REVIEW", "ACCEPTED", "REJECTED", "EXPIRED"]);
exports.createCategoryDto = zod_1.z.object({
    name: zod_1.z.string().min(1),
    code: zod_1.z.string().min(1),
    description: zod_1.z.string().nullable().optional(),
    allowedTypes: zod_1.z.array(docType).min(1),
    requiresValidation: zod_1.z.boolean().optional(),
    maxVersions: zod_1.z.number().int().min(1).optional(),
    retentionDays: zod_1.z.number().int().min(1).nullable().optional(),
});
exports.updateCategoryDto = exports.createCategoryDto.partial();
exports.listDocumentsQueryDto = zod_1.z.object({
    status: docStatus.optional(),
    type: docType.optional(),
    categoryId: zod_1.z.string().optional(),
    ownerUserId: zod_1.z.string().uuid().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
});
exports.uploadDocumentDto = zod_1.z.object({
    type: docType,
    ownerUserId: zod_1.z.string().uuid(),
    categoryId: zod_1.z.string().nullable().optional(),
    expiryDate: zod_1.z.string().nullable().optional(),
    notes: zod_1.z.string().nullable().optional(),
    demandeId: zod_1.z.string().nullable().optional(),
    requirementId: zod_1.z.string().nullable().optional(),
});
exports.validateDocumentDto = zod_1.z.object({
    status: zod_1.z.enum(["ACCEPTED", "REJECTED"]),
    reviewNote: zod_1.z.string().optional(),
});
exports.auditQueryDto = zod_1.z.object({
    documentId: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(200).optional(),
});
//# sourceMappingURL=dto.js.map