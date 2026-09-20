"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAgentsQueryDto = exports.updateAgentDto = exports.createAgentDto = void 0;
const zod_1 = require("zod");
const departmentEnum = zod_1.z.enum([
    "CONSULAR",
    "ADMINISTRATIVE",
    "FINANCIAL",
    "COMMUNICATION",
    "SECURITY",
    "STUDIES",
]);
exports.createAgentDto = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).optional(),
    phone: zod_1.z.string().nullable().optional(),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    matricule: zod_1.z.string().min(1),
    roleTitle: zod_1.z.string().nullable().optional(),
    department: departmentEnum,
    officeNumber: zod_1.z.string().nullable().optional(),
    roleId: zod_1.z.string().uuid(),
    active: zod_1.z.boolean().optional(),
});
exports.updateAgentDto = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().nullable().optional(),
    firstName: zod_1.z.string().min(1).optional(),
    lastName: zod_1.z.string().min(1).optional(),
    matricule: zod_1.z.string().min(1).optional(),
    roleTitle: zod_1.z.string().nullable().optional(),
    department: departmentEnum.optional(),
    officeNumber: zod_1.z.string().nullable().optional(),
    active: zod_1.z.boolean().optional(),
});
exports.listAgentsQueryDto = zod_1.z.object({
    search: zod_1.z.string().optional(),
    status: zod_1.z.string().optional(),
    department: departmentEnum.optional(),
    role: zod_1.z.string().optional(),
});
//# sourceMappingURL=dto.js.map