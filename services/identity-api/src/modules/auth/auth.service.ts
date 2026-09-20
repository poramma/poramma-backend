import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../../db/connection";
import {
  users,
  otps,
  sessions,
  userProfiles,
  roles,
  userRoles,
  rolePermissions,
  permissions,
} from "../../db/schema.identity";
import { eq, and, isNull, sql, inArray, desc } from "drizzle-orm";
import { randomInt } from "crypto";
import { addMinutes } from "date-fns";
import { UnauthorizedError, NotFoundError, ConflictError } from "@poramma/utils";
import { writeAudit } from "../../shared/audit";
import { markSessionActive, revokeSession } from "@poramma/cache";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const ACCESS_EXPIRATION = "15m";
// "Rester connecté" décoché : la session ne doit pas survivre bien au-delà
// d'une journée de travail. Coché : 30 jours, comme avant. Les deux valeurs
// pilotent à la fois l'expiration du JWT refresh ET le TTL de la clé Redis
// de session active (voir markSessionActive) — les deux doivent rester
// cohérents entre eux.
const REFRESH_EXPIRATION_REMEMBERED = "30d";
const REFRESH_EXPIRATION_SESSION = "12h";
const REFRESH_EXPIRATION_REMEMBERED_SECONDS = 30 * 24 * 60 * 60;
const REFRESH_EXPIRATION_SESSION_SECONDS = 12 * 60 * 60;

interface RbacContext {
  roleAssignmentId: string | null;
  roleId: string | null;
  roleName: string | null;
  roleLevel: number;
  permissionCodes: string[];
}

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: FullUser;
}

export interface FullUser {
  id: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: string;
  mfaEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  profile: any;
  roles: any[];
  activeRole: any;
  permissions: string[];
}

/**
 * Loads the caller's active role (the one with the lowest level number,
 * i.e. most senior, among their active assignments) and its permission
 * codes. A user with no active role assignment (public/community accounts)
 * gets roleLevel 999 and no permissions — consistent with
 * requireAuth's default for tokens issued before this existed.
 */
async function getRbacContext(userId: string): Promise<RbacContext> {
  const assignments = await db
    .select({
      assignmentId: userRoles.id,
      roleId: roles.id,
      roleName: roles.name,
      roleLevel: roles.level,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId), eq(userRoles.isActive, true)));

  if (assignments.length === 0) {
    return { roleAssignmentId: null, roleId: null, roleName: null, roleLevel: 999, permissionCodes: [] };
  }

  const active = assignments.reduce((best, a) => (a.roleLevel < best.roleLevel ? a : best));

  const perms = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, active.roleId));

  return {
    roleAssignmentId: active.assignmentId,
    roleId: active.roleId,
    roleName: active.roleName,
    roleLevel: active.roleLevel,
    permissionCodes: perms.map((p) => p.code),
  };
}

/**
 * Builds the full Utilisateur shape expected by the frontend (GET /auth/me,
 * login response). Exported as getFullUserById for reuse by other modules
 * (e.g. agents.service.ts embeds this as Agent.user).
 */
export async function buildFullUser(userId: string): Promise<FullUser> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError("Utilisateur introuvable");

  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

  const assignments = await db
    .select({
      id: userRoles.id,
      userId: userRoles.userId,
      roleId: userRoles.roleId,
      assignedBy: userRoles.assignedBy,
      assignedAt: userRoles.assignedAt,
      expiresAt: userRoles.expiresAt,
      isActive: userRoles.isActive,
      roleName: roles.name,
      roleDescription: roles.description,
      roleLevel: roles.level,
      roleIsSystem: roles.isSystem,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  // Permissions détaillées de chaque rôle de l'utilisateur (le profil les affiche : sans cela la liste était toujours vide).
  const roleIds = [...new Set(assignments.map((a) => a.roleId))];
  const permRows = roleIds.length
    ? await db
        .select({
          roleId: rolePermissions.roleId,
          id: permissions.id,
          code: permissions.code,
          name: permissions.name,
          description: permissions.description,
          resource: permissions.resource,
          action: permissions.action,
          category: permissions.category,
          minRoleLevel: permissions.minRoleLevel,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(inArray(rolePermissions.roleId, roleIds))
    : [];
  const permissionsOfRole = (roleId: string) =>
    permRows
      .filter((p) => p.roleId === roleId)
      .map(({ roleId: _r, ...perm }) => ({ ...perm, description: perm.description ?? perm.name }))
      .sort((x, y) => x.code.localeCompare(y.code));

  const [lastSession] = await db.select({ at: sessions.createdAt }).from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.createdAt)).limit(1);

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
      permissions: permissionsOfRole(a.roleId) as any[],
    },
    assignedBy: a.assignedBy,
    assignedAt: a.assignedAt,
    expiresAt: a.expiresAt,
    isActive: a.isActive,
  }));

  const activeAssignment = roleShapes
    .filter((r) => r.isActive)
    .reduce<typeof roleShapes[number] | null>(
      (best, r) => (!best || r.role.level < best.role.level ? r : best),
      null
    );

  const rbac = await getRbacContext(userId);

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    emailVerified: user.emailVerified!,
    phoneVerified: user.phoneVerified!,
    status: user.status!,
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

function signTokens(userId: string, email: string, sessionId: string, rbac: RbacContext, rememberMe: boolean) {
  const payload = {
    sub: userId,
    email,
    roleId: rbac.roleId,
    roleName: rbac.roleName,
    roleLevel: rbac.roleLevel,
    permissions: rbac.permissionCodes,
    sessionId,
  };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRATION });
  const refreshToken = jwt.sign(
    { sub: userId, sessionId },
    JWT_SECRET,
    { expiresIn: rememberMe ? REFRESH_EXPIRATION_REMEMBERED : REFRESH_EXPIRATION_SESSION }
  );
  return { accessToken, refreshToken };
}

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    throw new ConflictError("Email déjà utilisé");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const [newUser] = await db
    .insert(users)
    .values({ email, passwordHash, status: "UNVERIFIED", emailVerified: false })
    .returning();

  const [profile] = await db
    .insert(userProfiles)
    .values({ userId: newUser.id, firstName, lastName, userType: "other" })
    .returning();

  // Public registration never assigns an RBAC role — only ADMIN-created
  // agent accounts have one (see [[rbac_hierarchy_decision]]).
  return { ...newUser, profile };
}

export async function checkUser(email: string) {
  const existing = await db.select().from(users).where(eq(users.email, email));
  return existing.length > 0;
}

export async function saveOpt(email: string, otp: string) {
  const existing = await db.select().from(otps).where(eq(otps.userId, email));
  if (existing.length > 0) {
    await db.update(otps).set({ codeHash: otp, expiresAt: addMinutes(new Date(), 5) }).where(eq(otps.userId, email));
    return;
  }

  await db.insert(otps).values({
    userId: email,
    codeHash: otp,
    channel: "email",
    purpose: "signup",
    expiresAt: addMinutes(new Date(), 5),
  });
}

/**
 * Verifies the OTP and, on success, creates the account (users +
 * user_profiles) in the same transaction — this is where public
 * registration actually completes (see dto.ts's verifyOtpDto comment).
 * Previously this only flipped otps.consumedAt and never touched the users
 * table, leaving /auth/register as a disconnected, unreachable-by-OTP path;
 * that endpoint is left in place for any other caller, but the OTP flow no
 * longer depends on it.
 */
export async function verifyOtp(
  email: string,
  otp: string,
  password: string,
  firstName: string,
  lastName: string,
  phone?: string | null
) {
  const [record] = await db.select().from(otps).where(eq(otps.userId, email));
  if (!record) throw new NotFoundError("Utilisateur introuvable");

  if (record.consumedAt) throw new ConflictError("OTP déjà utilisé");

  const valid = await bcrypt.compare(otp, record.codeHash);
  if (!valid) throw new UnauthorizedError("OTP invalide");

  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) throw new ConflictError("Ce compte existe déjà");

  const passwordHash = await bcrypt.hash(password, 10);

  const created = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email, phone: phone ?? null, passwordHash, status: "VERIFIED", emailVerified: true })
      .returning();

    const [profile] = await tx
      .insert(userProfiles)
      .values({ userId: user.id, firstName, lastName, userType: "other" })
      .returning();

    await tx.update(otps).set({ consumedAt: new Date() }).where(eq(otps.id, record.id));

    return { user, profile };
  });

  await writeAudit({
    action: "REGISTER",
    entityType: "USER",
    entityId: created.user.id,
    actor: { userId: created.user.id, roleName: null },
    details: { email, viaOtp: true },
  });

  return { success: true, user: { id: created.user.id, email: created.user.email } };
}

export async function login(
  email: string,
  password: string,
  ip?: string | null,
  ua?: string | null,
  rememberMe = false
): Promise<AuthResponse> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    await writeAudit({
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
    throw new UnauthorizedError("Identifiants invalides");
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    await writeAudit({
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
    throw new UnauthorizedError("Identifiants invalides");
  }

  if (user.status === "SUSPENDED") {
    await writeAudit({
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
    throw new UnauthorizedError("Compte suspendu");
  }

  const rbac = await getRbacContext(user.id);

  // Placeholder refresh hash — replaced right after signing, once the real
  // refresh token (which embeds this session's id) exists.
  const [session] = await db
    .insert(sessions)
    .values({ userId: user.id, refreshTokenHash: "pending", ip: "0.0.0.0", userAgent: "unknown", rememberMe })
    .returning();

  const { accessToken, refreshToken } = signTokens(user.id, user.email, session.id, rbac, rememberMe);
  const refreshHash = await bcrypt.hash(refreshToken, 10);
  await db.update(sessions).set({ refreshTokenHash: refreshHash }).where(eq(sessions.id, session.id));
  await markSessionActive(
    session.id,
    rememberMe ? REFRESH_EXPIRATION_REMEMBERED_SECONDS : REFRESH_EXPIRATION_SESSION_SECONDS
  );

  const fullUser = await buildFullUser(user.id);

  await writeAudit({
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

export async function refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  let decoded: { sub: string; sessionId: string };
  try {
    decoded = jwt.verify(refreshToken, JWT_SECRET) as { sub: string; sessionId: string };
  } catch {
    throw new UnauthorizedError("Token invalide");
  }

  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, decoded.sessionId), eq(sessions.userId, decoded.sub), isNull(sessions.revokedAt)));
  if (!session) throw new UnauthorizedError("Session invalide ou révoquée");

  const hashMatches = await bcrypt.compare(refreshToken, session.refreshTokenHash);
  if (!hashMatches) throw new UnauthorizedError("Token invalide");

  const [user] = await db.select().from(users).where(eq(users.id, decoded.sub));
  if (!user) throw new UnauthorizedError("Utilisateur introuvable");

  // Rotate: revoke this session, open a new one bound to the new tokens.
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id));
  await revokeSession(session.id);

  const rbac = await getRbacContext(user.id);
  const [newSession] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      refreshTokenHash: "pending",
      ip: session.ip,
      userAgent: session.userAgent,
      rememberMe: session.rememberMe,
    })
    .returning();

  const tokens = signTokens(user.id, user.email, newSession.id, rbac, session.rememberMe);
  const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
  await db.update(sessions).set({ refreshTokenHash: refreshHash }).where(eq(sessions.id, newSession.id));
  await markSessionActive(
    newSession.id,
    session.rememberMe ? REFRESH_EXPIRATION_REMEMBERED_SECONDS : REFRESH_EXPIRATION_SESSION_SECONDS
  );

  return tokens;
}

export async function logout(userId: string, sessionId?: string) {
  if (sessionId) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
    await revokeSession(sessionId);
  } else {
    const active = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, userId));
    await Promise.all(active.map((s) => revokeSession(s.id)));
  }
}

export async function getProfile(userId: string) {
  return buildFullUser(userId);
}

export async function updateProfile(userId: string, data: any) {
  const [user] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  return user;
}

/** GET /auth/roles — the system's role catalog, for the switch-role UI. */
export async function listSystemRoles() {
  return db.select().from(roles).orderBy(roles.level);
}

/** GET /auth/permissions — the caller's own permission codes. */
export async function getMyPermissions(userId: string): Promise<string[]> {
  const rbac = await getRbacContext(userId);
  return rbac.permissionCodes;
}

/**
 * POST /auth/switch-role — reissues an access token (only) reflecting a
 * different one of the caller's own role assignments.
 *
 * Deliberately does NOT rotate the refresh token: the refresh token's
 * plaintext isn't retained server-side (only its bcrypt hash), so a new one
 * can't be issued without invalidating the session's existing refresh
 * token. Consequence: the *next* POST /auth/refresh recomputes the active
 * role as the most senior one (see getRbacContext), so a switch to a less
 * senior role does not survive a token refresh. Persisting the session's
 * currently-active role across refreshes (a `sessions.active_role_id`
 * column) is a reasonable follow-up, not built in this pass.
 */
export async function switchRole(
  userId: string,
  sessionId: string,
  roleId: string
): Promise<{ accessToken: string; user: FullUser }> {
  const [assignment] = await db
    .select()
    .from(userRoles)
    .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId), eq(userRoles.isActive, true)));
  if (!assignment) throw new NotFoundError("Ce rôle n'est pas attribué à cet utilisateur");

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError("Utilisateur introuvable");

  const [role] = await db.select().from(roles).where(eq(roles.id, roleId));
  const perms = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));

  const rbac: RbacContext = {
    roleAssignmentId: assignment.id,
    roleId: role.id,
    roleName: role.name,
    roleLevel: role.level,
    permissionCodes: perms.map((p) => p.code),
  };

  // rememberMe n'affecte que l'expiration du refresh token, ici ignoré (voir
  // le commentaire de switchRole ci-dessus) — la valeur passée est sans effet.
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

// ============================================================
// Mot de passe oublié
// ============================================================

const RESET_CODE_TTL_MINUTES = 15;
/** Clé de la ligne `otps` pour un code de réinitialisation — préfixée pour ne JAMAIS se mélanger au code d'inscription (même colonne, même email). */
const resetKey = (email: string) => `reset:${email.toLowerCase()}`;

/**
 * Prépare un code de réinitialisation pour ce compte. Renvoie `null` quand il
 * n'y a rien à envoyer (compte inconnu ou suspendu) : l'appelant répond ALORS
 * exactement comme pour un compte existant — on ne révèle jamais si une
 * adresse a un compte.
 */
export async function createPasswordResetCode(email: string): Promise<{ email: string; firstName: string | null; code: string } | null> {
  const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
  if (!user || user.status === "SUSPENDED") return null;

  const code = randomInt(100000, 1000000).toString();
  const codeHash = await bcrypt.hash(code, 10);

  // Un seul code actif par compte : une nouvelle demande invalide la précédente.
  await db.delete(otps).where(and(eq(otps.userId, resetKey(email)), eq(otps.purpose, "reset")));
  await db.insert(otps).values({ userId: resetKey(email), codeHash, channel: "email", purpose: "reset", expiresAt: addMinutes(new Date(), RESET_CODE_TTL_MINUTES) });

  const [profile] = await db.select({ firstName: userProfiles.firstName }).from(userProfiles).where(eq(userProfiles.userId, user.id));
  return { email: user.email, firstName: profile?.firstName ?? null, code };
}

/**
 * Définit un nouveau mot de passe à partir du code reçu par email. Toutes les
 * sessions ouvertes du compte sont révoquées (un mot de passe compromis ne doit
 * pas laisser d'accès actif) et l'opération est auditée.
 */
export async function resetPasswordWithCode(params: { email: string; code: string; newPassword: string; ip?: string | null; ua?: string | null }) {
  const invalid = () => new UnauthorizedError("Code invalide ou expiré. Demandez un nouveau code.");

  const [record] = await db.select().from(otps).where(and(eq(otps.userId, resetKey(params.email)), eq(otps.purpose, "reset")));
  if (!record || record.consumedAt || record.expiresAt < new Date()) throw invalid();
  if (!(await bcrypt.compare(params.code, record.codeHash))) throw invalid();

  const [user] = await db.select().from(users).where(sql`lower(${users.email}) = ${params.email.toLowerCase()}`);
  if (!user || user.status === "SUSPENDED") throw invalid();

  const passwordHash = await bcrypt.hash(params.newPassword, 10);
  const activeSessions = await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id));
    await tx.update(otps).set({ consumedAt: new Date() }).where(eq(otps.id, record.id));
    return tx.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, user.id), isNull(sessions.revokedAt))).returning({ id: sessions.id });
  });
  await Promise.all(activeSessions.map((s) => revokeSession(s.id)));

  await writeAudit({
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
