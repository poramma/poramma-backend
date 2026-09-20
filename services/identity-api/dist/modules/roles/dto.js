"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignRoleToUserDto = exports.assignPermissionDto = exports.updateRoleDto = exports.createRoleDto = void 0;
const zod_1 = require("zod");
exports.createRoleDto = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50),
    description: zod_1.z.string().min(1),
    level: zod_1.z.number().int().min(1).max(100),
    isSystem: zod_1.z.boolean().optional(),
});
exports.updateRoleDto = zod_1.z.object({
    name: zod_1.z.string().min(2).max(50).optional(),
    description: zod_1.z.string().min(1).optional(),
    level: zod_1.z.number().int().min(1).max(100).optional(),
});
exports.assignPermissionDto = zod_1.z.object({
    permissionCode: zod_1.z.string().min(1),
});
exports.assignRoleToUserDto = zod_1.z.object({
    roleId: zod_1.z.string().uuid(),
});
//# sourceMappingURL=dto.js.map