"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoles = getRoles;
exports.getRole = getRole;
exports.createRole = createRole;
exports.updateRole = updateRole;
exports.deleteRole = deleteRole;
exports.getPermissions = getPermissions;
exports.assignPermissionToRole = assignPermissionToRole;
exports.removePermissionFromRole = removePermissionFromRole;
exports.assignRoleToUser = assignRoleToUser;
exports.removeRoleFromUser = removeRoleFromUser;
const rolesService = __importStar(require("./roles.service"));
const dto_1 = require("./dto");
const dto_2 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
async function getRoles(_req, res) {
    res.json((0, dto_2.ok)(await rolesService.listRoles()));
}
async function getRole(req, res) {
    res.json((0, dto_2.ok)(await rolesService.getRole(req.params.id)));
}
async function createRole(req, res) {
    const parsed = dto_1.createRoleDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const role = await rolesService.createRole(parsed.data);
    res.status(201).json((0, dto_2.ok)(role));
}
async function updateRole(req, res) {
    const parsed = dto_1.updateRoleDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const role = await rolesService.updateRole(req.params.id, parsed.data);
    res.json((0, dto_2.ok)(role));
}
async function deleteRole(req, res) {
    await rolesService.deleteRole(req.params.id);
    res.status(204).send();
}
async function getPermissions(_req, res) {
    res.json((0, dto_2.ok)(await rolesService.listPermissions()));
}
async function assignPermissionToRole(req, res) {
    const parsed = dto_1.assignPermissionDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    await rolesService.assignPermissionToRole(req.params.roleId, parsed.data.permissionCode);
    res.status(201).json((0, dto_2.ok)(null));
}
async function removePermissionFromRole(req, res) {
    await rolesService.removePermissionFromRole(req.params.roleId, req.params.permissionCode);
    res.status(204).send();
}
async function assignRoleToUser(req, res) {
    const parsed = dto_1.assignRoleToUserDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const callerUserId = req.userId;
    const assignment = await rolesService.assignRoleToUser(req.params.userId, parsed.data.roleId, callerUserId);
    res.status(201).json((0, dto_2.ok)(assignment));
}
async function removeRoleFromUser(req, res) {
    const callerUserId = req.userId;
    await rolesService.removeRoleFromUser(req.params.userId, req.params.roleId, callerUserId);
    res.status(204).send();
}
//# sourceMappingURL=roles.controller.js.map