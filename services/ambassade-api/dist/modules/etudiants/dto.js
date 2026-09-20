"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateEtudiantsDto = exports.suspendEtudiantDto = exports.rejectEtudiantDto = exports.validateEtudiantDto = exports.searchEtudiantsQueryDto = exports.listEtudiantsQueryDto = void 0;
const zod_1 = require("zod");
exports.listEtudiantsQueryDto = zod_1.z.object({
    search: zod_1.z.string().optional(),
    status: zod_1.z.enum(["PENDING", "VALIDATED", "REJECTED", "SUSPENDED"]).optional(),
    city: zod_1.z.string().optional(),
    university: zod_1.z.string().optional(),
    faculty: zod_1.z.string().optional(),
    studyLevel: zod_1.z.string().optional(),
    hasBourse: zod_1.z.coerce.boolean().optional(),
    hasInue: zod_1.z.coerce.boolean().optional(),
    page: zod_1.z.coerce.number().int().min(1).optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(200).optional(),
    sortBy: zod_1.z.enum(["name", "registeredAt", "status"]).optional(),
    sortOrder: zod_1.z.enum(["asc", "desc"]).optional(),
});
exports.searchEtudiantsQueryDto = zod_1.z.object({
    q: zod_1.z.string().min(1),
});
exports.validateEtudiantDto = zod_1.z.object({
    comment: zod_1.z.string().optional(),
});
exports.rejectEtudiantDto = zod_1.z.object({
    reason: zod_1.z.string().min(1, "Le motif de rejet est requis"),
});
exports.suspendEtudiantDto = zod_1.z.object({
    reason: zod_1.z.string().min(1, "Le motif de suspension est requis"),
});
exports.estimateEtudiantsDto = zod_1.z.object({
    city: zod_1.z.string().optional(),
    university: zod_1.z.string().optional(),
    faculty: zod_1.z.string().optional(),
    studyLevel: zod_1.z.string().optional(),
    hasBourse: zod_1.z.boolean().optional(),
    status: zod_1.z.enum(["PENDING", "VALIDATED", "REJECTED", "SUSPENDED"]).optional(),
});
//# sourceMappingURL=dto.js.map