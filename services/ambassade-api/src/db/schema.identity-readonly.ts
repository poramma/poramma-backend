import { uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { inArray } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { db } from "./connection";
import { NotFoundError } from "@poramma/utils";
import { identitySchema } from "@poramma/ambassade-core";

// identityUsers/identityUserProfiles vivent maintenant dans
// @poramma/ambassade-core (partagés avec communaute-api) — ré-exportés ici
// pour ne pas casser les imports existants. identityAgents/
// identityStudentProfiles/identityStudentScholarships restent locaux
// (staff-only, pas encore nécessaires à communaute-api).
export const identity = identitySchema.identity;
export const identityUsers = identitySchema.identityUsers;
export const identityUserProfiles = identitySchema.identityUserProfiles;

export const identityAgents = identity.table("agents", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  matricule: varchar("matricule", { length: 50 }),
  roleTitle: varchar("role_title", { length: 255 }),
  department: varchar("department", { length: 30 }),
  officeNumber: varchar("office_number", { length: 50 }),
  active: boolean("active"),
});

/** Résout l'userId propriétaire d'un agent — utilisé pour les vérifications "c'est mon propre planning". */
export async function getAgentUserId(agentId: string): Promise<string> {
  const [row] = await db.select({ userId: identityAgents.userId }).from(identityAgents).where(eq(identityAgents.id, agentId));
  if (!row) throw new NotFoundError("Agent introuvable");
  return row.userId;
}

// --- Champs étudiants (ciblage des campagnes) ---
export const identityStudentProfiles = identity.table("student_profiles", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  university: varchar("university", { length: 255 }),
  faculty: varchar("faculty", { length: 255 }),
  studyLevel: varchar("study_level", { length: 100 }),
});

export const identityStudentScholarships = identity.table("student_scholarships", {
  id: uuid("id").primaryKey(),
  studentProfileId: uuid("student_profile_id").notNull(),
  isRecipient: boolean("is_recipient"),
  decisionNumber: varchar("decision_number", { length: 100 }),
  promotion: varchar("promotion", { length: 100 }), // année de promotion — source de l'année INUE pour les boursiers
});

export interface CampagneTargetFilters {
  cities?: string[];
  statuses?: string[];
  studyLevels?: string[];
  faculties?: string[];
  hasBourse?: boolean;
  universities?: string[];
  userIds?: string[];
}

/**
 * Résout les userId étudiants correspondant aux filtres de ciblage d'une
 * campagne — filtrage entièrement en mémoire après un seul select large
 * (le volume d'étudiants reste modeste pour une ambassade ; pas besoin
 * d'un query builder dynamique complexe pour ce croisement de tables).
 */
export async function resolveTargetUserIds(filters: CampagneTargetFilters): Promise<string[]> {
  if (filters.userIds && filters.userIds.length > 0) return filters.userIds;

  const users = await db
    .select({
      userId: identityUsers.id,
      status: identityUsers.status,
      city: identityUserProfiles.city,
      userType: identityUserProfiles.userType,
    })
    .from(identityUsers)
    .innerJoin(identityUserProfiles, eq(identityUserProfiles.userId, identityUsers.id))
    .where(eq(identityUserProfiles.userType, "student"));

  let candidates = users;
  if (filters.statuses?.length) candidates = candidates.filter((u) => filters.statuses!.includes(u.status ?? ""));
  if (filters.cities?.length) candidates = candidates.filter((u) => filters.cities!.includes(u.city ?? ""));

  if (filters.studyLevels?.length || filters.faculties?.length || filters.universities?.length || filters.hasBourse !== undefined) {
    const ids = candidates.map((u) => u.userId);
    if (ids.length === 0) return [];
    const profiles = await db.select().from(identityStudentProfiles).where(inArray(identityStudentProfiles.userId, ids));
    const profileByUser = new Map(profiles.map((p) => [p.userId, p]));

    let scholarshipByProfileId = new Map<string, boolean>();
    if (filters.hasBourse !== undefined) {
      const profileIds = profiles.map((p) => p.id);
      const scholarships = profileIds.length
        ? await db.select().from(identityStudentScholarships).where(inArray(identityStudentScholarships.studentProfileId, profileIds))
        : [];
      scholarshipByProfileId = new Map(scholarships.map((s) => [s.studentProfileId, !!s.isRecipient]));
    }

    candidates = candidates.filter((u) => {
      const profile = profileByUser.get(u.userId);
      if (filters.studyLevels?.length && !filters.studyLevels.includes(profile?.studyLevel ?? "")) return false;
      if (filters.faculties?.length && !filters.faculties.includes(profile?.faculty ?? "")) return false;
      if (filters.universities?.length && !filters.universities.includes(profile?.university ?? "")) return false;
      if (filters.hasBourse !== undefined) {
        const isRecipient = profile ? scholarshipByProfileId.get(profile.id) ?? false : false;
        if (isRecipient !== filters.hasBourse) return false;
      }
      return true;
    });
  }

  return candidates.map((u) => u.userId);
}
