"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shareInternalDocumentDto = exports.createInternalDocumentDto = exports.listInternalDocumentsQueryDto = void 0;
const zod_1 = require("zod");
const confidentiality = zod_1.z.enum(["PUBLIC", "INTERNAL", "RESTRICTED", "CONFIDENTIAL"]);
exports.listInternalDocumentsQueryDto = zod_1.z.object({
    department: zod_1.z.string().optional(),
    confidentiality: confidentiality.optional(),
    search: zod_1.z.string().optional(),
});
exports.createInternalDocumentDto = zod_1.z.object({
    title: zod_1.z.string().min(1),
    department: zod_1.z.string().min(1),
    confidentiality,
    tags: zod_1.z
        .string()
        .optional()
        .transform((s) => {
        if (!s)
            return [];
        try {
            const parsed = JSON.parse(s);
            return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
        }
        catch {
            return [];
        }
    }),
});
exports.shareInternalDocumentDto = zod_1.z.object({
    targetAgentIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
    targetRoleIds: zod_1.z.array(zod_1.z.string().uuid()).default([]),
});
//# sourceMappingURL=dto.js.map