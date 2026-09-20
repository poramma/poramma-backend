"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processAgentRequestDto = exports.listAgentRequestsQueryDto = exports.createAgentRequestDto = void 0;
const zod_1 = require("zod");
const ACCESS_CATEGORIES = ["SERVICE_ACCESS", "PERMISSION_CHANGE", "ROLE_CHANGE", "OTHER"];
const REPORT_CATEGORIES = ["ASSIGNMENT_ISSUE", "PERMISSION_ISSUE", "DATA_ISSUE", "SECURITY", "OTHER"];
exports.createAgentRequestDto = zod_1.z
    .object({
    kind: zod_1.z.enum(["ACCESS_REQUEST", "REPORT"]),
    category: zod_1.z.enum(["SERVICE_ACCESS", "PERMISSION_CHANGE", "ROLE_CHANGE", "ASSIGNMENT_ISSUE", "PERMISSION_ISSUE", "DATA_ISSUE", "SECURITY", "OTHER"]),
    subject: zod_1.z.string().trim().min(3, "Objet trop court").max(200),
    description: zod_1.z.string().trim().min(10, "Décrivez votre demande (10 caractères minimum)").max(3000),
    targetSubServiceId: zod_1.z.string().min(1).optional(),
    targetPermission: zod_1.z.string().max(100).optional(),
})
    .superRefine((v, ctx) => {
    const allowed = v.kind === "ACCESS_REQUEST" ? ACCESS_CATEGORIES : REPORT_CATEGORIES;
    if (!allowed.includes(v.category)) {
        ctx.addIssue({ code: "custom", path: ["category"], message: "Catégorie incompatible avec ce type de demande" });
    }
    if (v.category === "SERVICE_ACCESS" && !v.targetSubServiceId) {
        ctx.addIssue({ code: "custom", path: ["targetSubServiceId"], message: "Choisissez le service concerné" });
    }
});
exports.listAgentRequestsQueryDto = zod_1.z.object({
    status: zod_1.z.enum(["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED", "RESOLVED"]).optional(),
    kind: zod_1.z.enum(["ACCESS_REQUEST", "REPORT"]).optional(),
    category: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
});
exports.processAgentRequestDto = zod_1.z.object({
    status: zod_1.z.enum(["IN_PROGRESS", "APPROVED", "REJECTED", "RESOLVED"]),
    response: zod_1.z.string().trim().max(2000).optional(),
    applyAssignment: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=dto.js.map