"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildFullUser = buildFullUser;
exports.register = register;
exports.checkUser = checkUser;
exports.saveOpt = saveOpt;
exports.verifyOtp = verifyOtp;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
exports.listSystemRoles = listSystemRoles;
exports.getMyPermissions = getMyPermissions;
exports.switchRole = switchRole;
exports.createPasswordResetCode = createPasswordResetCode;
exports.resetPasswordWithCode = resetPasswordWithCode;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const connection_1 = require("../../db/connection");
const schema_identity_1 = require("../../db/schema.identity");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
const date_fns_1 = require("date-fns");
const utils_1 = require("@poramma/utils");
const audit_1 = require("../../shared/audit");
const cache_1 = require("@poramma/cache");
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const ACCESS_EXPIRATION = "15m";
const REFRESH_EXPIRATION_REMEMBERED = "30d";
const REFRESH_EXPIRATION_SESSION = "12h";
const REFRESH_EXPIRATION_REMEMBERED_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_EXPIRATION_SESSION_SECONDS = 12 * 60 * 60;
async function getRbacContext(userId) {
    const assignments = await connection_1.db
        .select({
        assignmentId: schema_identity_1.userRoles.id,
        roleId: schema_identity_1.roles.id,
        roleName: schema_identity_1.roles.name,
        roleLevel: schema_identity_1.roles.level,
    })
        .from(schema_identity_1.userRoles)
        .innerJoin(schema_identity_1.roles, (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.roleId, schema_identity_1.roles.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.userRoles.userId, userId), (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.isActive, true)));
    if (assignments.length === 0) {
        return { roleAssignmentId: null, roleId: null, roleName: null, roleLevel: 999, permissionCodes: [] };
    }
    const active = assignments.reduce((best, a) => (a.roleLevel < best.roleLevel ? a : best));
    const perms = await connection_1.db
        .select({ code: schema_identity_1.permissions.code })
        .from(schema_identity_1.rolePermissions)
        .innerJoin(schema_identity_1.permissions, (0, drizzle_orm_1.eq)(schema_identity_1.rolePermissions.permissionId, schema_identity_1.permissions.id))
        .where((0, drizzle_orm_1.eq)(schema_identity_1.rolePermissions.roleId, active.roleId));
    return {
        roleAssignmentId: active.assignmentId,
        roleId: active.roleId,
        roleName: active.roleName,
        roleLevel: active.roleLevel,
        permissionCodes: perms.map((p) => p.code),
    };
}
async function buildFullUser(userId) {
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId));
    if (!user)
        throw new utils_1.NotFoundError("Utilisateur introuvable");
    const [profile] = await connection_1.db.select().from(schema_identity_1.userProfiles).where((0, drizzle_orm_1.eq)(schema_identity_1.userProfiles.userId, userId));
    const assignments = await connection_1.db
        .select({
        id: schema_identity_1.userRoles.id,
        userId: schema_identity_1.userRoles.userId,
        roleId: schema_identity_1.userRoles.roleId,
        assignedBy: schema_identity_1.userRoles.assignedBy,
        assignedAt: schema_identity_1.userRoles.assignedAt,
        expiresAt: schema_identity_1.userRoles.expiresAt,
        isActive: schema_identity_1.userRoles.isActive,
        roleName: schema_identity_1.roles.name,
        roleDescription: schema_identity_1.roles.description,
        roleLevel: schema_identity_1.roles.level,
        roleIsSystem: schema_identity_1.roles.isSystem,
    })
        .from(schema_identity_1.userRoles)
        .innerJoin(schema_identity_1.roles, (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.roleId, schema_identity_1.roles.id))
        .where((0, drizzle_orm_1.eq)(schema_identity_1.userRoles.userId, userId));
    const roleIds = [...new Set(assignments.map((a) => a.roleId))];
    const permRows = roleIds.length
        ? await connection_1.db
            .select({
            roleId: schema_identity_1.rolePermissions.roleId,
            id: schema_identity_1.permissions.id,
            code: schema_identity_1.permissions.code,
            name: schema_identity_1.permissions.name,
            description: schema_identity_1.permissions.description,
            resource: schema_identity_1.permissions.resource,
            action: schema_identity_1.permissions.action,
            category: schema_identity_1.permissions.category,
            minRoleLevel: schema_identity_1.permissions.minRoleLevel,
        })
            .from(schema_identity_1.rolePermissions)
            .innerJoin(schema_identity_1.permissions, (0, drizzle_orm_1.eq)(schema_identity_1.rolePermissions.permissionId, schema_identity_1.permissions.id))
            .where((0, drizzle_orm_1.inArray)(schema_identity_1.rolePermissions.roleId, roleIds))
        : [];
    const permissionsOfRole = (roleId) => permRows
        .filter((p) => p.roleId === roleId)
        .map(({ roleId: _r, ...perm }) => ({ ...perm, description: perm.description ?? perm.name }))
        .sort((x, y) => x.code.localeCompare(y.code));
    const [lastSession] = await connection_1.db.select({ at: schema_identity_1.sessions.createdAt }).from(schema_identity_1.sessions).where((0, drizzle_orm_1.eq)(schema_identity_1.sessions.userId, userId)).orderBy((0, drizzle_orm_1.desc)(schema_identity_1.sessions.createdAt)).limit(1);
    const roleShapes = assignments.map((a) => ({
        id: a.id,
        userId: a.userId,
        roleId: a.roleId,
        role: {
            id: a.roleId,
            name: a.roleName,
            description: a.roleDescription,
            level: a.roleLevel,
            isSystem: a.roleIsSystem,
            permissions: permissionsOfRole(a.roleId),
        },
        assignedBy: a.assignedBy,
        assignedAt: a.assignedAt,
        expiresAt: a.expiresAt,
        isActive: a.isActive,
    }));
    const activeAssignment = roleShapes
        .filter((r) => r.isActive)
        .reduce((best, r) => (!best || r.role.level < best.role.level ? r : best), null);
    const rbac = await getRbacContext(userId);
    return {
        id: user.id,
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        status: user.status,
        mfaEnabled: false,
        lastLoginAt: lastSession?.at ? lastSession.at.toISOString() : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        profile,
        roles: roleShapes,
        activeRole: activeAssignment?.role ?? undefined,
        permissions: rbac.permissionCodes,
    };
}
function signTokens(userId, email, sessionId, rbac, rememberMe) {
    const payload = {
        sub: userId,
        email,
        roleId: rbac.roleId,
        roleName: rbac.roleName,
        roleLevel: rbac.roleLevel,
        permissions: rbac.permissionCodes,
        sessionId,
    };
    const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRATION });
    const refreshToken = jsonwebtoken_1.default.sign({ sub: userId, sessionId }, JWT_SECRET, { expiresIn: rememberMe ? REFRESH_EXPIRATION_REMEMBERED : REFRESH_EXPIRATION_SESSION });
    return { accessToken, refreshToken };
}
async function register(email, password, firstName, lastName) {
    const existing = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.email, email));
    if (existing.length > 0) {
        throw new utils_1.ConflictError("Email déjà utilisé");
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const [newUser] = await connection_1.db
        .insert(schema_identity_1.users)
        .values({ email, passwordHash, status: "UNVERIFIED", emailVerified: false })
        .returning();
    const [profile] = await connection_1.db
        .insert(schema_identity_1.userProfiles)
        .values({ userId: newUser.id, firstName, lastName, userType: "other" })
        .returning();
    return { ...newUser, profile };
}
async function checkUser(email) {
    const existing = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.email, email));
    return existing.length > 0;
}
async function saveOpt(email, otp) {
    const existing = await connection_1.db.select().from(schema_identity_1.otps).where((0, drizzle_orm_1.eq)(schema_identity_1.otps.userId, email));
    if (existing.length > 0) {
        await connection_1.db.update(schema_identity_1.otps).set({ codeHash: otp, expiresAt: (0, date_fns_1.addMinutes)(new Date(), 5) }).where((0, drizzle_orm_1.eq)(schema_identity_1.otps.userId, email));
        return;
    }
    await connection_1.db.insert(schema_identity_1.otps).values({
        userId: email,
        codeHash: otp,
        channel: "email",
        purpose: "signup",
        expiresAt: (0, date_fns_1.addMinutes)(new Date(), 5),
    });
}
async function verifyOtp(email, otp, password, firstName, lastName, phone) {
    const [record] = await connection_1.db.select().from(schema_identity_1.otps).where((0, drizzle_orm_1.eq)(schema_identity_1.otps.userId, email));
    if (!record)
        throw new utils_1.NotFoundError("Utilisateur introuvable");
    if (record.consumedAt)
        throw new utils_1.ConflictError("OTP déjà utilisé");
    const valid = await bcryptjs_1.default.compare(otp, record.codeHash);
    if (!valid)
        throw new utils_1.UnauthorizedError("OTP invalide");
    const existing = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.email, email));
    if (existing.length > 0)
        throw new utils_1.ConflictError("Ce compte existe déjà");
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const created = await connection_1.db.transaction(async (tx) => {
        const [user] = await tx
            .insert(schema_identity_1.users)
            .values({ email, phone: phone ?? null, passwordHash, status: "VERIFIED", emailVerified: true })
            .returning();
        const [profile] = await tx
            .insert(schema_identity_1.userProfiles)
            .values({ userId: user.id, firstName, lastName, userType: "other" })
            .returning();
        await tx.update(schema_identity_1.otps).set({ consumedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.otps.id, record.id));
        return { user, profile };
    });
    await (0, audit_1.writeAudit)({
        action: "REGISTER",
        entityType: "USER",
        entityId: created.user.id,
        actor: { userId: created.user.id, roleName: null },
        details: { email, viaOtp: true },
    });
    return { success: true, user: { id: created.user.id, email: created.user.email } };
}
async function login(email, password, ip, ua, rememberMe = false) {
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.email, email));
    if (!user) {
        await (0, audit_1.writeAudit)({
            action: "LOGIN_ATTEMPT",
            entityType: "SESSION",
            entityId: email,
            actor: { userId: null, roleName: null },
            result: "REJECT",
            severity: "WARNING",
            details: { reason: "UNKNOWN_EMAIL" },
            ip,
            ua,
        });
        throw new utils_1.UnauthorizedError("Identifiants invalides");
    }
    const match = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!match) {
        await (0, audit_1.writeAudit)({
            action: "LOGIN_ATTEMPT",
            entityType: "SESSION",
            entityId: user.id,
            actor: { userId: user.id, roleName: null },
            result: "REJECT",
            severity: "WARNING",
            details: { reason: "INVALID_CREDENTIALS" },
            ip,
            ua,
        });
        throw new utils_1.UnauthorizedError("Identifiants invalides");
    }
    if (user.status === "SUSPENDED") {
        await (0, audit_1.writeAudit)({
            action: "LOGIN_ATTEMPT",
            entityType: "SESSION",
            entityId: user.id,
            actor: { userId: user.id, roleName: null },
            result: "REJECT",
            severity: "CRITICAL",
            details: { reason: "SUSPENDED" },
            ip,
            ua,
        });
        throw new utils_1.UnauthorizedError("Compte suspendu");
    }
    const rbac = await getRbacContext(user.id);
    const [session] = await connection_1.db
        .insert(schema_identity_1.sessions)
        .values({ userId: user.id, refreshTokenHash: "pending", ip: "0.0.0.0", userAgent: "unknown", rememberMe })
        .returning();
    const { accessToken, refreshToken } = signTokens(user.id, user.email, session.id, rbac, rememberMe);
    const refreshHash = await bcryptjs_1.default.hash(refreshToken, 10);
    await connection_1.db.update(schema_identity_1.sessions).set({ refreshTokenHash: refreshHash }).where((0, drizzle_orm_1.eq)(schema_identity_1.sessions.id, session.id));
    await (0, cache_1.markSessionActive)(session.id, rememberMe ? REFRESH_EXPIRATION_REMEMBERED_SECONDS : REFRESH_EXPIRATION_SESSION_SECONDS);
    const fullUser = await buildFullUser(user.id);
    await (0, audit_1.writeAudit)({
        action: "LOGIN",
        entityType: "SESSION",
        entityId: session.id,
        actor: { userId: user.id, roleName: rbac.roleName },
        sessionId: session.id,
        ip,
        ua,
    });
    return { accessToken, refreshToken, user: fullUser };
}
async function refresh(refreshToken) {
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(refreshToken, JWT_SECRET);
    }
    catch {
        throw new utils_1.UnauthorizedError("Token invalide");
    }
    const [session] = await connection_1.db
        .select()
        .from(schema_identity_1.sessions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.sessions.id, decoded.sessionId), (0, drizzle_orm_1.eq)(schema_identity_1.sessions.userId, decoded.sub), (0, drizzle_orm_1.isNull)(schema_identity_1.sessions.revokedAt)));
    if (!session)
        throw new utils_1.UnauthorizedError("Session invalide ou révoquée");
    const hashMatches = await bcryptjs_1.default.compare(refreshToken, session.refreshTokenHash);
    if (!hashMatches)
        throw new utils_1.UnauthorizedError("Token invalide");
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, decoded.sub));
    if (!user)
        throw new utils_1.UnauthorizedError("Utilisateur introuvable");
    await connection_1.db.update(schema_identity_1.sessions).set({ revokedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.sessions.id, session.id));
    await (0, cache_1.revokeSession)(session.id);
    const rbac = await getRbacContext(user.id);
    const [newSession] = await connection_1.db
        .insert(schema_identity_1.sessions)
        .values({
        userId: user.id,
        refreshTokenHash: "pending",
        ip: session.ip,
        userAgent: session.userAgent,
        rememberMe: session.rememberMe,
    })
        .returning();
    const tokens = signTokens(user.id, user.email, newSession.id, rbac, session.rememberMe);
    const refreshHash = await bcryptjs_1.default.hash(tokens.refreshToken, 10);
    await connection_1.db.update(schema_identity_1.sessions).set({ refreshTokenHash: refreshHash }).where((0, drizzle_orm_1.eq)(schema_identity_1.sessions.id, newSession.id));
    await (0, cache_1.markSessionActive)(newSession.id, session.rememberMe ? REFRESH_EXPIRATION_REMEMBERED_SECONDS : REFRESH_EXPIRATION_SESSION_SECONDS);
    return tokens;
}
async function logout(userId, sessionId) {
    if (sessionId) {
        await connection_1.db
            .update(schema_identity_1.sessions)
            .set({ revokedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.sessions.id, sessionId), (0, drizzle_orm_1.eq)(schema_identity_1.sessions.userId, userId)));
        await (0, cache_1.revokeSession)(sessionId);
    }
    else {
        const active = await connection_1.db
            .select({ id: schema_identity_1.sessions.id })
            .from(schema_identity_1.sessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.sessions.userId, userId), (0, drizzle_orm_1.isNull)(schema_identity_1.sessions.revokedAt)));
        await connection_1.db.update(schema_identity_1.sessions).set({ revokedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.sessions.userId, userId));
        await Promise.all(active.map((s) => (0, cache_1.revokeSession)(s.id)));
    }
}
async function getProfile(userId) {
    return buildFullUser(userId);
}
async function updateProfile(userId, data) {
    const [user] = await connection_1.db
        .update(schema_identity_1.users)
        .set({ ...data, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId))
        .returning();
    return user;
}
async function listSystemRoles() {
    return connection_1.db.select().from(schema_identity_1.roles).orderBy(schema_identity_1.roles.level);
}
async function getMyPermissions(userId) {
    const rbac = await getRbacContext(userId);
    return rbac.permissionCodes;
}
async function switchRole(userId, sessionId, roleId) {
    const [assignment] = await connection_1.db
        .select()
        .from(schema_identity_1.userRoles)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.userRoles.userId, userId), (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.roleId, roleId), (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.isActive, true)));
    if (!assignment)
        throw new utils_1.NotFoundError("Ce rôle n'est pas attribué à cet utilisateur");
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId));
    if (!user)
        throw new utils_1.NotFoundError("Utilisateur introuvable");
    const [role] = await connection_1.db.select().from(schema_identity_1.roles).where((0, drizzle_orm_1.eq)(schema_identity_1.roles.id, roleId));
    const perms = await connection_1.db
        .select({ code: schema_identity_1.permissions.code })
        .from(schema_identity_1.rolePermissions)
        .innerJoin(schema_identity_1.permissions, (0, drizzle_orm_1.eq)(schema_identity_1.rolePermissions.permissionId, schema_identity_1.permissions.id))
        .where((0, drizzle_orm_1.eq)(schema_identity_1.rolePermissions.roleId, roleId));
    const rbac = {
        roleAssignmentId: assignment.id,
        roleId: role.id,
        roleName: role.name,
        roleLevel: role.level,
        permissionCodes: perms.map((p) => p.code),
    };
    const { accessToken } = signTokens(user.id, user.email, sessionId, rbac, false);
    const fullUser = await buildFullUser(user.id);
    fullUser.activeRole = {
        id: role.id,
        name: role.name,
        description: role.description,
        level: role.level,
        isSystem: role.isSystem,
        permissions: [],
    };
    return { accessToken, user: fullUser };
}
const RESET_CODE_TTL_MINUTES = 15;
const resetKey = (email) => `reset:${email.toLowerCase()}`;
async function createPasswordResetCode(email) {
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.sql) `lower(${schema_identity_1.users.email}) = ${email.toLowerCase()}`);
    if (!user || user.status === "SUSPENDED")
        return null;
    const code = (0, crypto_1.randomInt)(100000, 1000000).toString();
    const codeHash = await bcryptjs_1.default.hash(code, 10);
    await connection_1.db.delete(schema_identity_1.otps).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.otps.userId, resetKey(email)), (0, drizzle_orm_1.eq)(schema_identity_1.otps.purpose, "reset")));
    await connection_1.db.insert(schema_identity_1.otps).values({ userId: resetKey(email), codeHash, channel: "email", purpose: "reset", expiresAt: (0, date_fns_1.addMinutes)(new Date(), RESET_CODE_TTL_MINUTES) });
    const [profile] = await connection_1.db.select({ firstName: schema_identity_1.userProfiles.firstName }).from(schema_identity_1.userProfiles).where((0, drizzle_orm_1.eq)(schema_identity_1.userProfiles.userId, user.id));
    return { email: user.email, firstName: profile?.firstName ?? null, code };
}
async function resetPasswordWithCode(params) {
    const invalid = () => new utils_1.UnauthorizedError("Code invalide ou expiré. Demandez un nouveau code.");
    const [record] = await connection_1.db.select().from(schema_identity_1.otps).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.otps.userId, resetKey(params.email)), (0, drizzle_orm_1.eq)(schema_identity_1.otps.purpose, "reset")));
    if (!record || record.consumedAt || record.expiresAt < new Date())
        throw invalid();
    if (!(await bcryptjs_1.default.compare(params.code, record.codeHash)))
        throw invalid();
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.sql) `lower(${schema_identity_1.users.email}) = ${params.email.toLowerCase()}`);
    if (!user || user.status === "SUSPENDED")
        throw invalid();
    const passwordHash = await bcryptjs_1.default.hash(params.newPassword, 10);
    const activeSessions = await connection_1.db.transaction(async (tx) => {
        await tx.update(schema_identity_1.users).set({ passwordHash, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, user.id));
        await tx.update(schema_identity_1.otps).set({ consumedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.otps.id, record.id));
        return tx.update(schema_identity_1.sessions).set({ revokedAt: new Date() }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.sessions.userId, user.id), (0, drizzle_orm_1.isNull)(schema_identity_1.sessions.revokedAt))).returning({ id: schema_identity_1.sessions.id });
    });
    await Promise.all(activeSessions.map((s) => (0, cache_1.revokeSession)(s.id)));
    await (0, audit_1.writeAudit)({
        action: "RESET_PASSWORD",
        entityType: "USER",
        entityId: user.id,
        actor: { userId: user.id, roleName: null },
        severity: "WARNING",
        details: { revokedSessions: activeSessions.length },
        ip: params.ip,
        ua: params.ua,
    });
    return { email: user.email };
}
//# sourceMappingURL=auth.service.js.map