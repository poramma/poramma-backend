"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequirementDto = exports.addCommentDto = exports.assignDto = exports.updateStatusDto = exports.listDemandesQueryDto = exports.createDemandeDto = void 0;
const zod_1 = require("zod");
const appStatus = zod_1.z.enum([
    "DRAFT",
    "SUBMITTED",
    "IN_REVIEW",
    "ADDITIONAL_INFO_REQUIRED",
    "UNDER_VERIFICATION",
    "APPROVED",
    "REJECTED",
    "COMPLETED",
    "CANCELLED",
    "ARCHIVED",
]);
const priority = zod_1.z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
const requirementStatus = zod_1.z.enum(["PENDING", "PROVIDED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"]);
exports.createDemandeDto = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    subServiceId: zod_1.z.string().min(1),
    priority: priority.optional(),
    totalAmount: zod_1.z.number().nullable().optional(),
    currency: zod_1.z.string().nullable().optional(),
    customPayload: zod_1.z.record(zod_1.z.unknown()).nullable().optional(),
});
exports.listDemandesQueryDto = zod_1.z.object({
    status: appStatus.optional(),
    priority: priority.optional(),
    subServiceId: zod_1.z.string().optional(),
    assignedAgentId: zod_1.z.string().optional(),
    dossierNumber: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    isOverdue: zod_1.z.coerce.boolean().optional(),
    page: zod_1.z.coerce.number().int().min(1).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).optional(),
});
exports.updateStatusDto = zod_1.z.object({
    status: appStatus,
    comment: zod_1.z.string().min(1),
    isVisibleToUser: zod_1.z.boolean(),
    assignedAgentId: zod_1.z.string().uuid().optional(),
});
exports.assignDto = zod_1.z.object({
    agentId: zod_1.z.string().uuid(),
    note: zod_1.z.string().optional(),
});
exports.addCommentDto = zod_1.z.object({
    content: zod_1.z.string().min(1),
    isInternal: zod_1.z.boolean().optional(),
});
exports.validateRequirementDto = zod_1.z.object({
    status: requirementStatus,
    note: zod_1.z.string().optional(),
});
//# sourceMappingURL=dto.js.map