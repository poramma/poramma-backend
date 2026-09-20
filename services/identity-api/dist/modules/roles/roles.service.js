"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listRoles = listRoles;
exports.getRole = getRole;
exports.createRole = createRole;
exports.updateRole = updateRole;
exports.deleteRole = deleteRole;
exports.listPermissions = listPermissions;
exports.assignPermissionToRole = assignPermissionToRole;
exports.removePermissionFromRole = removePermissionFromRole;
exports.assignRoleToUser = assignRoleToUser;
exports.removeRoleFromUser = removeRoleFromUser;
const connection_1 = require("../../db/connection");
const schema_identity_1 = require("../../db/schema.identity");
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const audit_1 = require("../../shared/audit");
async function permissionsForRole(roleId) {
    const rows = await connection_1.db
        .select({
        id: schema_identity_1.permissions.id,
        code: schema_identity_1.permissions.code,
        name: schema_identity_1.permissions.name,
        description: schema_identity_1.permissions.description,
        resource: schema_identity_1.permissions.resource,
        action: schema_identity_1.permissions.action,
        category: schema_identity_1.permissions.category,
    })
        .from(schema_identity_1.rolePermissions)
        .innerJoin(schema_identity_1.permissions, (0, drizzle_orm_1.eq)(schema_identity_1.rolePermissions.permissionId, schema_identity_1.permissions.id))
        .where((0, drizzle_orm_1.eq)(schema_identity_1.rolePermissions.roleId, roleId));
    return rows;
}
async function listRoles() {
    const allRoles = await connection_1.db.select().from(schema_identity_1.roles).orderBy(schema_identity_1.roles.level);
    return Promise.all(allRoles.map(async (r) => ({ ...r, permissions: await permissionsForRole(r.id) })));
}
async function getRole(id) {
    const [role] = await connection_1.db.select().from(schema_identity_1.roles).where((0, drizzle_orm_1.eq)(schema_identity_1.roles.id, id));
    if (!role)
        throw new utils_1.NotFoundError("Rôle introuvable");
    return { ...role, permissions: await permissionsForRole(id) };
}
async function createRole(data) {
    const [role] = await connection_1.db
        .insert(schema_identity_1.roles)
        .values({ name: data.name, description: data.description, level: data.level, isSystem: data.isSystem ?? false })
        .returning();
    return { ...role, permissions: [] };
}
async function updateRole(id, data) {
    const [existing] = await connection_1.db.select().from(schema_identity_1.roles).where((0, drizzle_orm_1.eq)(schema_identity_1.roles.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Rôle introuvable");
    if (existing.isSystem)
        throw new utils_1.ForbiddenError("Les rôles système ne peuvent pas être modifiés");
    const [updated] = await connection_1.db
        .update(schema_identity_1.roles)
        .set(data)
        .where((0, drizzle_orm_1.eq)(schema_identity_1.roles.id, id))
        .returning();
    return { ...updated, permissions: await permissionsForRole(id) };
}
async function deleteRole(id) {
    const [existing] = await connection_1.db.select().from(schema_identity_1.roles).where((0, drizzle_orm_1.eq)(schema_identity_1.roles.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Rôle introuvable");
    if (existing.isSystem)
        throw new utils_1.ForbiddenError("Les rôles système ne peuvent pas être supprimés");
    await connection_1.db.delete(schema_identity_1.roles).where((0, drizzle_orm_1.eq)(schema_identity_1.roles.id, id));
}
async function listPermissions() {
    return connection_1.db.select().from(schema_identity_1.permissions).orderBy(schema_identity_1.permissions.category, schema_identity_1.permissions.code);
}
async function assignPermissionToRole(roleId, permissionCode) {
    const [role] = await connection_1.db.select().from(schema_identity_1.roles).where((0, drizzle_orm_1.eq)(schema_identity_1.roles.id, roleId));
    if (!role)
        throw new utils_1.NotFoundError("Rôle introuvable");
    const [permission] = await connection_1.db.select().from(schema_identity_1.permissions).where((0, drizzle_orm_1.eq)(schema_identity_1.permissions.code, permissionCode));
    if (!permission)
        throw new utils_1.NotFoundError("Permission introuvable");
    const [existing] = await connection_1.db
        .select()
        .from(schema_identity_1.rolePermissions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.rolePermissions.roleId, roleId), (0, drizzle_orm_1.eq)(schema_identity_1.rolePermissions.permissionId, permission.id)));
    if (existing)
        return;
    await connection_1.db.insert(schema_identity_1.rolePermissions).values({ roleId, permissionId: permission.id });
}
async function removePermissionFromRole(roleId, permissionCode) {
    const [permission] = await connection_1.db.select().from(schema_identity_1.permissions).where((0, drizzle_orm_1.eq)(schema_identity_1.permissions.code, permissionCode));
    if (!permission)
        throw new utils_1.NotFoundError("Permission introuvable");
    await connection_1.db
        .delete(schema_identity_1.rolePermissions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.rolePermissions.roleId, roleId), (0, drizzle_orm_1.eq)(schema_identity_1.rolePermissions.permissionId, permission.id)));
}
async function assignRoleToUser(targetUserId, roleId, assignedBy) {
    const [role] = await connection_1.db.select().from(schema_identity_1.roles).where((0, drizzle_orm_1.eq)(schema_identity_1.roles.id, roleId));
    if (!role)
        throw new utils_1.NotFoundError("Rôle introuvable");
    const [existing] = await connection_1.db
        .select()
        .from(schema_identity_1.userRoles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.userRoles.userId, targetUserId), (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.roleId, roleId), (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.isActive, true)));
    if (existing)
        throw new utils_1.ConflictError("Ce rôle est déjà attribué à cet utilisateur");
    const [assignment] = await connection_1.db
        .insert(schema_identity_1.userRoles)
        .values({ userId: targetUserId, roleId, assignedBy, isActive: true })
        .returning();
    await (0, audit_1.writeAudit)({
        action: "ASSIGN_ROLE",
        entityType: "USER",
        entityId: targetUserId,
        actor: { userId: assignedBy, roleName: null },
        severity: "WARNING",
        details: { roleId, roleName: role.name },
    });
    return assignment;
}
async function removeRoleFromUser(targetUserId, roleId, callerUserId) {
    if (targetUserId === callerUserId) {
        throw new utils_1.ForbiddenError("Vous ne pouvez pas retirer votre propre rôle");
    }
    const [existing] = await connection_1.db
        .select()
        .from(schema_identity_1.userRoles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.userRoles.userId, targetUserId), (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.roleId, roleId)));
    if (!existing)
        throw new utils_1.NotFoundError("Attribution de rôle introuvable");
    await connection_1.db
        .update(schema_identity_1.userRoles)
        .set({ isActive: false })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.userRoles.userId, targetUserId), (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.roleId, roleId)));
    await (0, audit_1.writeAudit)({
        action: "REMOVE_ROLE",
        entityType: "USER",
        entityId: targetUserId,
        actor: { userId: callerUserId, roleName: null },
        severity: "WARNING",
        details: { roleId },
    });
}
//# sourceMappingURL=roles.service.js.map