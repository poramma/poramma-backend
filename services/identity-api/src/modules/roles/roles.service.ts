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

/**
 * Les rôles/permissions se partagent la même table pour l'ambassade et pour la
 * plateforme communautaire, mais ne se voient ni ne se modifient jamais entre
 * eux : tout ce module (appelé par le back-office ambassade) est limité à la
 * portée EMBASSY. L'équipe communautaire est gérée par modules/community-admin.
 */
const SCOPE = "EMBASSY";

function assertEmbassyRole(role: { scope: string } | undefined): asserts role is { scope: string } {
  if (!role || role.scope !== SCOPE) throw new NotFoundError("Rôle introuvable");
}

export async function listRoles() {
  const allRoles = await db.select().from(roles).where(eq(roles.scope, SCOPE)).orderBy(roles.level);
  return Promise.all(
    allRoles.map(async (r) => ({ ...r, permissions: await permissionsForRole(r.id) }))
  );
}

export async function getRole(id: string) {
  const [role] = await db.select().from(roles).where(eq(roles.id, id));
  assertEmbassyRole(role);
  return { ...role, permissions: await permissionsForRole(id) };
}

export async function createRole(data: { name: string; description: string; level: number; isSystem?: boolean }) {
  const [role] = await db
    .insert(roles)
    .values({ name: data.name, description: data.description, level: data.level, isSystem: data.isSystem ?? false, scope: SCOPE })
    .returning();
  return { ...role, permissions: [] };
}

export async function updateRole(id: string, data: Partial<{ name: string; description: string; level: number }>) {
  const [existing] = await db.select().from(roles).where(eq(roles.id, id));
  assertEmbassyRole(existing);
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
  assertEmbassyRole(existing);
  if (existing.isSystem) throw new ForbiddenError("Les rôles système ne peuvent pas être supprimés");

  await db.delete(roles).where(eq(roles.id, id));
}

export async function listPermissions() {
  return db.select().from(permissions).where(eq(permissions.scope, SCOPE)).orderBy(permissions.category, permissions.code);
}

export async function assignPermissionToRole(roleId: string, permissionCode: string) {
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  assertEmbassyRole(role);

  const [permission] = await db.select().from(permissions).where(eq(permissions.code, permissionCode));
  if (!permission || permission.scope !== SCOPE) throw new NotFoundError("Permission introuvable");

  const [existing] = await db
    .select()
    .from(rolePermissions)
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permission.id)));
  if (existing) return; // idempotent

  await db.insert(rolePermissions).values({ roleId, permissionId: permission.id });
}

export async function removePermissionFromRole(roleId: string, permissionCode: string) {
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  assertEmbassyRole(role);
  const [permission] = await db.select().from(permissions).where(eq(permissions.code, permissionCode));
  if (!permission || permission.scope !== SCOPE) throw new NotFoundError("Permission introuvable");

  await db
    .delete(rolePermissions)
    .where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permission.id)));
}

export async function assignRoleToUser(targetUserId: string, roleId: string, assignedBy: string) {
  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  assertEmbassyRole(role);

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

  const [roleRow] = await db.select().from(roles).where(eq(roles.id, roleId));
  assertEmbassyRole(roleRow);

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
