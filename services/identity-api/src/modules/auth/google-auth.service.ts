import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from "@poramma/utils";
import { revokeSession } from "@poramma/cache";
import { db } from "../../db/connection";
import { agents, roles, sessions, userProfiles, userRoles, users } from "../../db/schema.identity";
import { writeAudit } from "../../shared/audit";
import { openSession, type AuthResponse } from "./auth.service";
import { verifyGoogleIdToken, type GoogleIdentity } from "./google";

/**
 * Connexion / inscription / liaison avec Google.
 *
 * Règles de rattachement d'un jeton Google vérifié à un compte Poramma :
 *   1. un compte déjà lié à ce `sub` Google → c'est lui ;
 *   2. sinon un compte portant la même adresse email (Google a prouvé qu'elle appartient à la
 *      personne) → on le LIE, sauf s'il est déjà lié à un autre compte Google (409) ;
 *   3. sinon → nouveau compte de la communauté, email vérifié d'office (Google l'a vérifié).
 *
 * Jamais pour le personnel de l'ambassade : leurs comptes sont créés par l'administration et se
 * connectent avec leur mot de passe sur le back-office. Un compte suspendu est refusé comme au login.
 */

type User = typeof users.$inferSelect;
const PG_UNIQUE_VIOLATION = "23505";

interface Ctx {
  ip?: string | null;
  ua?: string | null;
  rememberMe?: boolean;
}

/** Hash bcrypt d'un secret aléatoire que personne ne connaît : le compte n'a (encore) aucun mot de passe utilisable. */
async function unusablePasswordHash(): Promise<string> {
  return bcrypt.hash(randomBytes(32).toString("hex"), 10);
}

async function isEmbassyStaff(userId: string): Promise<boolean> {
  const [agent] = await db.select({ id: agents.id }).from(agents).where(eq(agents.userId, userId)).limit(1);
  if (agent) return true;
  const [embassyRole] = await db
    .select({ id: userRoles.id })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(and(eq(userRoles.userId, userId), eq(userRoles.isActive, true), eq(roles.scope, "EMBASSY")))
    .limit(1);
  return !!embassyRole;
}

async function findBySub(sub: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(eq(users.googleSub, sub));
  return row;
}

async function findByEmail(email: string): Promise<User | undefined> {
  const [row] = await db.select().from(users).where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
  return row;
}

async function revokeAllSessions(userId: string) {
  const active = await db.update(sessions).set({ revokedAt: new Date() }).where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt))).returning({ id: sessions.id });
  await Promise.all(active.map((s) => revokeSession(s.id)));
  return active.length;
}

async function reject(reason: string, user: User | undefined, google: GoogleIdentity, ctx: Ctx, severity: "WARNING" | "CRITICAL" = "WARNING") {
  await writeAudit({
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

/** Rattache Google à un compte existant (mêmes email), en sécurisant les comptes enrôlés sur place. */
async function linkExisting(user: User, google: GoogleIdentity, ctx: Ctx): Promise<User> {
  const patch: Partial<typeof users.$inferInsert> = {
    googleSub: google.sub,
    emailVerified: true,
    status: user.status === "UNVERIFIED" || !user.status ? "VERIFIED" : user.status,
    updatedAt: new Date(),
  };

  // Compte enrôlé à l'ambassade : son mot de passe par défaut est connu de l'agent qui l'a créé. La
  // preuve de possession de la boîte mail (Google) remplace l'étape « choisir un mot de passe » : on
  // invalide ce mot de passe par défaut plutôt que de le laisser actif à côté de la connexion Google.
  const rotated = user.mustChangePassword;
  if (rotated) {
    patch.passwordHash = await unusablePasswordHash();
    patch.passwordSet = false;
    patch.mustChangePassword = false;
  }

  const [updated] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
  if (rotated) await revokeAllSessions(user.id);

  await writeAudit({
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

async function createFromGoogle(google: GoogleIdentity, ctx: Ctx): Promise<User> {
  const passwordHash = await unusablePasswordHash();
  const local = google.email.split("@")[0];
  const created = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: google.email, passwordHash, passwordSet: false, googleSub: google.sub, status: "VERIFIED", emailVerified: true })
      .returning();
    await tx.insert(userProfiles).values({ userId: user.id, firstName: google.firstName ?? local, lastName: google.lastName, userType: "other" });
    return user;
  });

  await writeAudit({
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

/** POST /auth/google — connecte, lie ou inscrit selon le cas. */
export async function signInWithGoogle(idToken: string, ctx: Ctx = {}): Promise<AuthResponse & { isNewUser: boolean }> {
  const google = await verifyGoogleIdToken(idToken);

  let user = await findBySub(google.sub);
  let isNewUser = false;

  if (!user) {
    const sameEmail = await findByEmail(google.email);
    if (sameEmail) {
      if (sameEmail.googleSub && sameEmail.googleSub !== google.sub) {
        await reject("EMAIL_LINKED_TO_OTHER_GOOGLE", sameEmail, google, ctx);
        throw new ConflictError("Ce compte Poramma est déjà lié à un autre compte Google.");
      }
      if (sameEmail.status === "SUSPENDED") {
        await reject("SUSPENDED", sameEmail, google, ctx, "CRITICAL");
        throw new UnauthorizedError("Compte suspendu");
      }
      if (await isEmbassyStaff(sameEmail.id)) {
        await reject("STAFF_ACCOUNT", sameEmail, google, ctx, "CRITICAL");
        throw new ForbiddenError("Ce compte appartient au personnel de l'ambassade : connectez-vous avec votre mot de passe.");
      }
      user = await linkExisting(sameEmail, google, ctx);
    } else {
      try {
        user = await createFromGoogle(google, ctx);
        isNewUser = true;
      } catch (err: any) {
        if (err?.code !== PG_UNIQUE_VIOLATION && err?.cause?.code !== PG_UNIQUE_VIOLATION) throw err;
        // Deux clics simultanés (ou deux onglets) : l'autre requête a créé le compte entre-temps.
        user = (await findBySub(google.sub)) ?? (await findByEmail(google.email));
        if (!user) throw err;
      }
    }
  }

  if (user.status === "SUSPENDED") {
    await reject("SUSPENDED", user, google, ctx, "CRITICAL");
    throw new UnauthorizedError("Compte suspendu");
  }
  if (!isNewUser && (await isEmbassyStaff(user.id))) {
    await reject("STAFF_ACCOUNT", user, google, ctx, "CRITICAL");
    throw new ForbiddenError("Ce compte appartient au personnel de l'ambassade : connectez-vous avec votre mot de passe.");
  }

  const session = await openSession(user, ctx.ip, ctx.ua, ctx.rememberMe ?? false, "google");
  return { ...session, isNewUser };
}

/** POST /auth/google/link — lie un compte Google au compte connecté (même adresse email exigée). */
export async function linkGoogleToAccount(userId: string, idToken: string, ctx: Ctx = {}) {
  const google = await verifyGoogleIdToken(idToken);
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError("Compte introuvable");
  if (await isEmbassyStaff(userId)) throw new ForbiddenError("Cette option n'est pas disponible pour le personnel de l'ambassade.");
  if (user.googleSub && user.googleSub !== google.sub) throw new ConflictError("Ce compte est déjà lié à un autre compte Google. Dissociez-le d'abord.");
  if (user.email.toLowerCase() !== google.email) {
    throw new ValidationError("Adresse différente", { email: [`Choisissez le compte Google associé à ${user.email}.`] });
  }
  const other = await findBySub(google.sub);
  if (other && other.id !== userId) throw new ConflictError("Ce compte Google est déjà lié à un autre compte Poramma.");
  if (user.googleSub === google.sub) return { linked: true };

  await db.update(users).set({ googleSub: google.sub, updatedAt: new Date() }).where(eq(users.id, userId));
  await writeAudit({ action: "LINK_GOOGLE", entityType: "USER", entityId: userId, actor: { userId, roleName: null }, severity: "WARNING", details: { fromSettings: true }, ip: ctx.ip, ua: ctx.ua });
  return { linked: true };
}

/** DELETE /auth/google — dissocie Google ; refusé tant qu'aucun mot de passe n'est défini (le compte deviendrait inaccessible). */
export async function unlinkGoogle(userId: string, ctx: Ctx = {}) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError("Compte introuvable");
  if (!user.googleSub) return { linked: false };
  if (!user.passwordSet) {
    throw new ConflictError("Définissez d'abord un mot de passe : sans lui, vous ne pourriez plus vous connecter à ce compte.");
  }
  await db.update(users).set({ googleSub: null, updatedAt: new Date() }).where(eq(users.id, userId));
  await writeAudit({ action: "UNLINK_GOOGLE", entityType: "USER", entityId: userId, actor: { userId, roleName: null }, severity: "WARNING", ip: ctx.ip, ua: ctx.ua });
  return { linked: false };
}
