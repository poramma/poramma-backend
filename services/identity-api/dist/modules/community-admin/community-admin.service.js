"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TEAM_ROLES = void 0;
exports.setMemberStatus = setMemberStatus;
exports.listTeam = listTeam;
exports.addTeamMember = addTeamMember;
exports.changeTeamRole = changeTeamRole;
exports.removeTeamMember = removeTeamMember;
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../db/connection");
const schema_identity_1 = require("../../db/schema.identity");
const utils_1 = require("@poramma/utils");
const cache_1 = require("@poramma/cache");
const audit_1 = require("../../shared/audit");
exports.TEAM_ROLES = ["COMMUNITY_ADMIN", "COMMUNITY_SUPPORT"];
async function assertMember(userId) {
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId));
    if (!user)
        throw new utils_1.NotFoundError("Membre introuvable");
    const [agent] = await connection_1.db.select({ id: schema_identity_1.agents.id }).from(schema_identity_1.agents).where((0, drizzle_orm_1.eq)(schema_identity_1.agents.userId, userId)).limit(1);
    const [role] = await connection_1.db
        .select({ id: schema_identity_1.userRoles.id })
        .from(schema_identity_1.userRoles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.userRoles.userId, userId), (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.isActive, true)))
        .limit(1);
    if (agent || role)
        throw new utils_1.NotFoundError("Membre introuvable");
    return user;
}
async function revokeAllSessions(userId) {
    const active = await connection_1.db.select({ id: schema_identity_1.sessions.id }).from(schema_identity_1.sessions).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.sessions.userId, userId), (0, drizzle_orm_1.isNull)(schema_identity_1.sessions.revokedAt)));
    await connection_1.db.update(schema_identity_1.sessions).set({ revokedAt: new Date() }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.sessions.userId, userId), (0, drizzle_orm_1.isNull)(schema_identity_1.sessions.revokedAt)));
    await Promise.all(active.map((s) => (0, cache_1.revokeSession)(s.id)));
}
async function setMemberStatus(targetId, status, caller, reason, ip, ua) {
    if (targetId === caller.userId)
        throw new utils_1.ForbiddenError("Vous ne pouvez pas modifier votre propre compte");
    const user = await assertMember(targetId);
    const next = status === "SUSPENDED" ? "SUSPENDED" : user.emailVerified ? "VERIFIED" : "UNVERIFIED";
    if (user.status === next)
        return { id: targetId, status: next };
    await connection_1.db.update(schema_identity_1.users).set({ status: next, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, targetId));
    if (status === "SUSPENDED")
        await revokeAllSessions(targetId);
    await (0, audit_1.writeAudit)({
        action: status === "SUSPENDED" ? "SUSPEND" : "REACTIVATE",
        entityType: "MEMBRE",
        entityId: targetId,
        actor: caller,
        severity: "WARNING",
        entitySnapshot: { from: { status: user.status }, to: { status: next } },
        details: { reason },
        ip,
        ua,
    });
    return { id: targetId, status: next };
}
async function roleByName(name) {
    const [role] = await connection_1.db.select().from(schema_identity_1.roles).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.roles.name, name), (0, drizzle_orm_1.eq)(schema_identity_1.roles.scope, "COMMUNITY")));
    if (!role)
        throw new utils_1.NotFoundError("Rôle introuvable");
    return role;
}
async function listTeam() {
    const rows = await connection_1.db
        .select({
        userId: schema_identity_1.users.id,
        email: schema_identity_1.users.email,
        status: schema_identity_1.users.status,
        firstName: schema_identity_1.userProfiles.firstName,
        lastName: schema_identity_1.userProfiles.lastName,
        role: schema_identity_1.roles.name,
        assignedAt: schema_identity_1.userRoles.assignedAt,
    })
        .from(schema_identity_1.userRoles)
        .innerJoin(schema_identity_1.roles, (0, drizzle_orm_1.eq)(schema_identity_1.roles.id, schema_identity_1.userRoles.roleId))
        .innerJoin(schema_identity_1.users, (0, drizzle_orm_1.eq)(schema_identity_1.users.id, schema_identity_1.userRoles.userId))
        .leftJoin(schema_identity_1.userProfiles, (0, drizzle_orm_1.eq)(schema_identity_1.userProfiles.userId, schema_identity_1.users.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.roles.scope, "COMMUNITY"), (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.isActive, true)))
        .orderBy(schema_identity_1.roles.level, schema_identity_1.users.email);
    return rows.map((r) => ({ ...r, name: [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email }));
}
async function activeAdminCount() {
    const [row] = await connection_1.db
        .select({ n: (0, drizzle_orm_1.sql) `count(distinct ${schema_identity_1.userRoles.userId})::int` })
        .from(schema_identity_1.userRoles)
        .innerJoin(schema_identity_1.roles, (0, drizzle_orm_1.eq)(schema_identity_1.roles.id, schema_identity_1.userRoles.roleId))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.roles.name, "COMMUNITY_ADMIN"), (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.isActive, true)));
    return row?.n ?? 0;
}
async function addTeamMember(email, roleName, caller, ip, ua) {
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.email, email.trim().toLowerCase()));
    if (!user)
        throw new utils_1.NotFoundError("Aucun compte avec cet email : la personne doit d'abord créer son compte sur la plateforme.");
    await assertMember(user.id);
    const role = await roleByName(roleName);
    await connection_1.db.insert(schema_identity_1.userRoles).values({ userId: user.id, roleId: role.id, assignedBy: caller.userId, isActive: true });
    await (0, audit_1.writeAudit)({
        action: "ASSIGN_ROLE",
        entityType: "EQUIPE_COMMUNAUTE",
        entityId: user.id,
        actor: caller,
        severity: "WARNING",
        details: { role: roleName, email: user.email },
        ip,
        ua,
    });
    return { userId: user.id, role: roleName };
}
async function changeTeamRole(targetId, roleName, caller, ip, ua) {
    const current = (await listTeam()).find((m) => m.userId === targetId);
    if (!current)
        throw new utils_1.NotFoundError("Membre de l'équipe introuvable");
    if (current.role === roleName)
        return { userId: targetId, role: roleName };
    if (current.role === "COMMUNITY_ADMIN" && (targetId === caller.userId || (await activeAdminCount()) <= 1)) {
        throw new utils_1.ConflictError("Il doit toujours rester au moins un administrateur de la communauté.");
    }
    const role = await roleByName(roleName);
    await connection_1.db.transaction(async (tx) => {
        const teamRoleIds = (await tx.select({ id: schema_identity_1.roles.id }).from(schema_identity_1.roles).where((0, drizzle_orm_1.eq)(schema_identity_1.roles.scope, "COMMUNITY"))).map((r) => r.id);
        await tx.update(schema_identity_1.userRoles).set({ isActive: false }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.userRoles.userId, targetId), (0, drizzle_orm_1.inArray)(schema_identity_1.userRoles.roleId, teamRoleIds)));
        await tx.insert(schema_identity_1.userRoles).values({ userId: targetId, roleId: role.id, assignedBy: caller.userId, isActive: true });
    });
    await revokeAllSessions(targetId);
    await (0, audit_1.writeAudit)({
        action: "CHANGE_ROLE",
        entityType: "EQUIPE_COMMUNAUTE",
        entityId: targetId,
        actor: caller,
        severity: "WARNING",
        entitySnapshot: { from: { role: current.role }, to: { role: roleName } },
        ip,
        ua,
    });
    return { userId: targetId, role: roleName };
}
async function removeTeamMember(targetId, caller, ip, ua) {
    if (targetId === caller.userId)
        throw new utils_1.ForbiddenError("Vous ne pouvez pas retirer votre propre accès");
    const current = (await listTeam()).find((m) => m.userId === targetId);
    if (!current)
        throw new utils_1.NotFoundError("Membre de l'équipe introuvable");
    if (current.role === "COMMUNITY_ADMIN" && (await activeAdminCount()) <= 1) {
        throw new utils_1.ConflictError("Il doit toujours rester au moins un administrateur de la communauté.");
    }
    const teamRoleIds = (await connection_1.db.select({ id: schema_identity_1.roles.id }).from(schema_identity_1.roles).where((0, drizzle_orm_1.eq)(schema_identity_1.roles.scope, "COMMUNITY"))).map((r) => r.id);
    await connection_1.db.update(schema_identity_1.userRoles).set({ isActive: false }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.userRoles.userId, targetId), (0, drizzle_orm_1.inArray)(schema_identity_1.userRoles.roleId, teamRoleIds)));
    await revokeAllSessions(targetId);
    await (0, audit_1.writeAudit)({
        action: "REMOVE_ROLE",
        entityType: "EQUIPE_COMMUNAUTE",
        entityId: targetId,
        actor: caller,
        severity: "WARNING",
        details: { role: current.role, email: current.email },
        ip,
        ua,
    });
}
//# sourceMappingURL=community-admin.service.js.map