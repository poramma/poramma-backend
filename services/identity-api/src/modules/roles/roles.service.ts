import { db } from "../../db/connection";
import { roles, permissions, rolePermissions, userRoles } from "../../db/schema.identity";
import { eq, and } from "drizzle-orm";
import { NotFoundError, ForbiddenError, ConflictError } from "@poramma/utils";
import { writeAudit } from "../../shared/audit";

async function permissionsForRole(roleId: string) {
  const rows = await db
    .select({
      id: permissions.id,
      code: permissions.code,
      name: permissions.name,
      description: permissions.description,
      resource: permissions.resource,
      action: permissions.action,
      category: permissions.category,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));
  return rows;
}

export async function listRoles() {
  const allRoles = await db.select().from(roles).orderBy(roles.level);
  return Promise.all(
    allRoles.map(async (r) => ({ ...r, permissions: await permissionsForRole(r.id) }))
  );
}

export async function getRole(id: string) {
  const [role] = await db.select().from(roles).where(eq(roles.id, id));
  if (!role) throw new NotFoundError("Rôle introuvable");
  return { ...role, permissions: await permissionsForRole(id) };
}

export async function createRole(data: { name: string; description: string; level: number; isSystem?: boolean }) {
  const [role] = await db
    .insert(roles)
    .values({ name: data.name, description: data.description, level: data.level, isSystem: data.isSystem ?? false })
    .returning();
  return { ...role, permissions: [] };
}

export async function updateRole(id: string, data: Partial<{ name: string; description: string; level: number }>) {
  const [existing] = await db.select().from(roles).where(eq(roles.id, id));
  if (!existing) throw new NotFoundError("Rôle introuvable");
  if (existing.isSystem) throw new ForbiddenError("Les rôles système ne peuvent pas être modifiés");

  const [updated] = await db
    .update(roles)
    .set(data)
    .where(eq(roles.id, id))
    .returning();
  return { ...updated, permissions: await permissionsForRole(id) };
}

export async function deleteRole(id: string) {
  const [existing] = await db.select().from(roles).where(eq(roles.id, id));
  if (!existing) throw new NotFoundError("Rôle introuvable");
  if (existing.isSystem) throw new ForbiddenError("Les rôles système ne peuvent pas être supprimés");

  await db.delete(roles).where(eq(roles.id, id));
}

export async function listPermissions() {
  return db.select().from(permissions).orderBy(permissions.category, permissions.code);
}

export async function assignPermissionToRole(roleId: string, permissionCode: string) {
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  if (!role) throw new NotFoundError("Rôle introuvable");

  const [permission] = await db.select().from(permissions).where(eq(permissions.code, permissionCode));
  if (!permission) throw new NotFoundError("Permission introuvable");

  const [existing] = await db
    .select()
    .from(rolePermissions)
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permission.id)));
  if (existing) return; // idempotent

  await db.insert(rolePermissions).values({ roleId, permissionId: permission.id });
}

export async function removePermissionFromRole(roleId: string, permissionCode: string) {
  const [permission] = await db.select().from(permissions).where(eq(permissions.code, permissionCode));
  if (!permission) throw new NotFoundError("Permission introuvable");

  await db
    .delete(rolePermissions)
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permission.id)));
}

export async function assignRoleToUser(targetUserId: string, roleId: string, assignedBy: string) {
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  if (!role) throw new NotFoundError("Rôle introuvable");

  const [existing] = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, targetUserId), eq(userRoles.roleId, roleId), eq(userRoles.isActive, true)));
  if (existing) throw new ConflictError("Ce rôle est déjà attribué à cet utilisateur");

  const [assignment] = await db
    .insert(userRoles)
    .values({ userId: targetUserId, roleId, assignedBy, isActive: true })
    .returning();

  await writeAudit({
    action: "ASSIGN_ROLE",
    entityType: "USER",
    entityId: targetUserId,
    actor: { userId: assignedBy, roleName: null },
    severity: "WARNING",
    details: { roleId, roleName: role.name },
  });

  return assignment;
}

/**
 * Deactivates a user's role assignment. Refuses to let a caller remove
 * their own assignment — self-service demotion/lockout protection, mirrors
 * the "ADMIN can't delete their own account" rule (giant prompt USR-05)
 * applied to role removal.
 */
export async function removeRoleFromUser(targetUserId: string, roleId: string, callerUserId: string) {
  if (targetUserId === callerUserId) {
    throw new ForbiddenError("Vous ne pouvez pas retirer votre propre rôle");
  }

  const [existing] = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, targetUserId), eq(userRoles.roleId, roleId)));
  if (!existing) throw new NotFoundError("Attribution de rôle introuvable");

  await db
    .update(userRoles)
    .set({ isActive: false })
    .where(and(eq(userRoles.userId, targetUserId), eq(userRoles.roleId, roleId)));

  await writeAudit({
    action: "REMOVE_ROLE",
    entityType: "USER",
    entityId: targetUserId,
    actor: { userId: callerUserId, roleName: null },
    severity: "WARNING",
    details: { roleId },
  });
}
