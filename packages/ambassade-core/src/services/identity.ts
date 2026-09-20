import { eq, inArray } from "drizzle-orm";
import type { Db } from "../db-type";
import { identityUsers, identityUserProfiles } from "../schema/identity";
import { etudiants } from "../schema/etudiants";

export async function getActorName(db: Db, userId: string): Promise<string> {
  const [profile] = await db
    .select({ firstName: identityUserProfiles.firstName, lastName: identityUserProfiles.lastName })
    .from(identityUserProfiles)
    .where(eq(identityUserProfiles.userId, userId));
  if (!profile) return "Utilisateur";
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Utilisateur";
}

/**
 * L'INUE est attribué et stocké côté ambassade (`ambassade.etudiants.inue`) ;
 * la colonne `identity.user_profiles.inue` n'est jamais mise à jour. On la
 * surcharge donc ici pour que TOUT consommateur (demandes, rendez-vous, audit,
 * impressions…) affiche l'INUE réellement attribué plutôt que « N/A ».
 */
function withInue<P extends { inue?: string | null }>(profile: P | null | undefined, inue: string | null | undefined) {
  if (!profile) return null;
  return { ...profile, inue: inue ?? profile.inue ?? null };
}

export async function getUser(db: Db, userId: string) {
  const [user] = await db.select().from(identityUsers).where(eq(identityUsers.id, userId));
  if (!user) return null;
  const [profile] = await db.select().from(identityUserProfiles).where(eq(identityUserProfiles.userId, userId));
  const [tracking] = await db.select({ inue: etudiants.inue }).from(etudiants).where(eq(etudiants.userId, userId));
  return { ...user, profile: withInue(profile, tracking?.inue) };
}

/** Même forme que `getUser`, pour plusieurs utilisateurs en 3 requêtes (listes paginées : journal d'audit…). */
export async function getUsersByIds(db: Db, userIds: string[]) {
  const ids = [...new Set(userIds)];
  const result = new Map<string, NonNullable<Awaited<ReturnType<typeof getUser>>>>();
  if (!ids.length) return result;

  const [users, profiles, trackings] = await Promise.all([
    db.select().from(identityUsers).where(inArray(identityUsers.id, ids)),
    db.select().from(identityUserProfiles).where(inArray(identityUserProfiles.userId, ids)),
    db.select({ userId: etudiants.userId, inue: etudiants.inue }).from(etudiants).where(inArray(etudiants.userId, ids)),
  ]);
  for (const user of users) {
    const profile = profiles.find((p) => p.userId === user.id);
    const tracking = trackings.find((t) => t.userId === user.id);
    result.set(user.id, { ...user, profile: withInue(profile, tracking?.inue) });
  }
  return result;
}
