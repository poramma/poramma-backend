"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signInWithGoogle = signInWithGoogle;
exports.linkGoogleToAccount = linkGoogleToAccount;
exports.unlinkGoogle = unlinkGoogle;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const cache_1 = require("@poramma/cache");
const connection_1 = require("../../db/connection");
const schema_identity_1 = require("../../db/schema.identity");
const audit_1 = require("../../shared/audit");
const auth_service_1 = require("./auth.service");
const google_1 = require("./google");
const PG_UNIQUE_VIOLATION = "23505";
async function unusablePasswordHash() {
    return bcryptjs_1.default.hash((0, crypto_1.randomBytes)(32).toString("hex"), 10);
}
async function isEmbassyStaff(userId) {
    const [agent] = await connection_1.db.select({ id: schema_identity_1.agents.id }).from(schema_identity_1.agents).where((0, drizzle_orm_1.eq)(schema_identity_1.agents.userId, userId)).limit(1);
    if (agent)
        return true;
    const [embassyRole] = await connection_1.db
        .select({ id: schema_identity_1.userRoles.id })
        .from(schema_identity_1.userRoles)
        .innerJoin(schema_identity_1.roles, (0, drizzle_orm_1.eq)(schema_identity_1.roles.id, schema_identity_1.userRoles.roleId))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.userRoles.userId, userId), (0, drizzle_orm_1.eq)(schema_identity_1.userRoles.isActive, true), (0, drizzle_orm_1.eq)(schema_identity_1.roles.scope, "EMBASSY")))
        .limit(1);
    return !!embassyRole;
}
async function findBySub(sub) {
    const [row] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.googleSub, sub));
    return row;
}
async function findByEmail(email) {
    const [row] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.sql) `lower(${schema_identity_1.users.email}) = ${email.toLowerCase()}`);
    return row;
}
async function revokeAllSessions(userId) {
    const active = await connection_1.db.update(schema_identity_1.sessions).set({ revokedAt: new Date() }).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_1.sessions.userId, userId), (0, drizzle_orm_1.isNull)(schema_identity_1.sessions.revokedAt))).returning({ id: schema_identity_1.sessions.id });
    await Promise.all(active.map((s) => (0, cache_1.revokeSession)(s.id)));
    return active.length;
}
async function reject(reason, user, google, ctx, severity = "WARNING") {
    await (0, audit_1.writeAudit)({
        action: "LOGIN_ATTEMPT",
        entityType: "SESSION",
        entityId: user?.id ?? google.email,
        actor: { userId: user?.id ?? null, roleName: null },
        result: "REJECT",
        severity,
        details: { reason, method: "google" },
        ip: ctx.ip,
        ua: ctx.ua,
        domain: user ? undefined : "COMMUNITY",
    });
}
async function linkExisting(user, google, ctx) {
    const patch = {
        googleSub: google.sub,
        emailVerified: true,
        status: user.status === "UNVERIFIED" || !user.status ? "VERIFIED" : user.status,
        updatedAt: new Date(),
    };
    const rotated = user.mustChangePassword;
    if (rotated) {
        patch.passwordHash = await unusablePasswordHash();
        patch.passwordSet = false;
        patch.mustChangePassword = false;
    }
    const [updated] = await connection_1.db.update(schema_identity_1.users).set(patch).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, user.id)).returning();
    if (rotated)
        await revokeAllSessions(user.id);
    await (0, audit_1.writeAudit)({
        action: "LINK_GOOGLE",
        entityType: "USER",
        entityId: user.id,
        actor: { userId: user.id, roleName: null },
        severity: "WARNING",
        details: { defaultPasswordInvalidated: rotated },
        ip: ctx.ip,
        ua: ctx.ua,
    });
    return updated;
}
async function createFromGoogle(google, ctx) {
    const passwordHash = await unusablePasswordHash();
    const local = google.email.split("@")[0];
    const created = await connection_1.db.transaction(async (tx) => {
        const [user] = await tx
            .insert(schema_identity_1.users)
            .values({ email: google.email, passwordHash, passwordSet: false, googleSub: google.sub, status: "VERIFIED", emailVerified: true })
            .returning();
        await tx.insert(schema_identity_1.userProfiles).values({ userId: user.id, firstName: google.firstName ?? local, lastName: google.lastName, userType: "other" });
        return user;
    });
    await (0, audit_1.writeAudit)({
        action: "REGISTER",
        entityType: "USER",
        entityId: created.id,
        actor: { userId: created.id, roleName: null },
        details: { email: google.email, method: "google" },
        ip: ctx.ip,
        ua: ctx.ua,
    });
    return created;
}
async function signInWithGoogle(idToken, ctx = {}) {
    const google = await (0, google_1.verifyGoogleIdToken)(idToken);
    let user = await findBySub(google.sub);
    let isNewUser = false;
    if (!user) {
        const sameEmail = await findByEmail(google.email);
        if (sameEmail) {
            if (sameEmail.googleSub && sameEmail.googleSub !== google.sub) {
                await reject("EMAIL_LINKED_TO_OTHER_GOOGLE", sameEmail, google, ctx);
                throw new utils_1.ConflictError("Ce compte Poramma est déjà lié à un autre compte Google.");
            }
            if (sameEmail.status === "SUSPENDED") {
                await reject("SUSPENDED", sameEmail, google, ctx, "CRITICAL");
                throw new utils_1.UnauthorizedError("Compte suspendu");
            }
            if (await isEmbassyStaff(sameEmail.id)) {
                await reject("STAFF_ACCOUNT", sameEmail, google, ctx, "CRITICAL");
                throw new utils_1.ForbiddenError("Ce compte appartient au personnel de l'ambassade : connectez-vous avec votre mot de passe.");
            }
            user = await linkExisting(sameEmail, google, ctx);
        }
        else {
            try {
                user = await createFromGoogle(google, ctx);
                isNewUser = true;
            }
            catch (err) {
                if (err?.code !== PG_UNIQUE_VIOLATION && err?.cause?.code !== PG_UNIQUE_VIOLATION)
                    throw err;
                user = (await findBySub(google.sub)) ?? (await findByEmail(google.email));
                if (!user)
                    throw err;
            }
        }
    }
    if (user.status === "SUSPENDED") {
        await reject("SUSPENDED", user, google, ctx, "CRITICAL");
        throw new utils_1.UnauthorizedError("Compte suspendu");
    }
    if (!isNewUser && (await isEmbassyStaff(user.id))) {
        await reject("STAFF_ACCOUNT", user, google, ctx, "CRITICAL");
        throw new utils_1.ForbiddenError("Ce compte appartient au personnel de l'ambassade : connectez-vous avec votre mot de passe.");
    }
    const session = await (0, auth_service_1.openSession)(user, ctx.ip, ctx.ua, ctx.rememberMe ?? false, "google");
    return { ...session, isNewUser };
}
async function linkGoogleToAccount(userId, idToken, ctx = {}) {
    const google = await (0, google_1.verifyGoogleIdToken)(idToken);
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId));
    if (!user)
        throw new utils_1.NotFoundError("Compte introuvable");
    if (await isEmbassyStaff(userId))
        throw new utils_1.ForbiddenError("Cette option n'est pas disponible pour le personnel de l'ambassade.");
    if (user.googleSub && user.googleSub !== google.sub)
        throw new utils_1.ConflictError("Ce compte est déjà lié à un autre compte Google. Dissociez-le d'abord.");
    if (user.email.toLowerCase() !== google.email) {
        throw new utils_1.ValidationError("Adresse différente", { email: [`Choisissez le compte Google associé à ${user.email}.`] });
    }
    const other = await findBySub(google.sub);
    if (other && other.id !== userId)
        throw new utils_1.ConflictError("Ce compte Google est déjà lié à un autre compte Poramma.");
    if (user.googleSub === google.sub)
        return { linked: true };
    await connection_1.db.update(schema_identity_1.users).set({ googleSub: google.sub, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId));
    await (0, audit_1.writeAudit)({ action: "LINK_GOOGLE", entityType: "USER", entityId: userId, actor: { userId, roleName: null }, severity: "WARNING", details: { fromSettings: true }, ip: ctx.ip, ua: ctx.ua });
    return { linked: true };
}
async function unlinkGoogle(userId, ctx = {}) {
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId));
    if (!user)
        throw new utils_1.NotFoundError("Compte introuvable");
    if (!user.googleSub)
        return { linked: false };
    if (!user.passwordSet) {
        throw new utils_1.ConflictError("Définissez d'abord un mot de passe : sans lui, vous ne pourriez plus vous connecter à ce compte.");
    }
    await connection_1.db.update(schema_identity_1.users).set({ googleSub: null, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId));
    await (0, audit_1.writeAudit)({ action: "UNLINK_GOOGLE", entityType: "USER", entityId: userId, actor: { userId, roleName: null }, severity: "WARNING", ip: ctx.ip, ua: ctx.ua });
    return { linked: false };
}
//# sourceMappingURL=google-auth.service.js.map