import { and, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "../../db/connection";
import {
  identityUsers,
  identityUserProfiles,
  identityStudentProfiles,
  identityStudentScholarships,
} from "../../db/schema.identity-readonly";

/**
 * Donnée brute d'un étudiant, telle qu'elle vit côté identité (jamais
 * possédée par ambassade-api). Le statut de validation et l'INUE ne sont
 * PAS ici — voir schema.etudiants.ts's `etudiants` table.
 */
export interface EtudiantRaw {
  userId: string;
  email: string;
  phone: string | null;
  accountStatus: string | null; // UNVERIFIED | VERIFIED | SUSPENDED (compte identity, distinct du statut de validation étudiant)
  registeredAt: Date | null;
  inue: string | null; // toujours null aujourd'hui côté identity (voir project decision) — lu quand même par cohérence du modèle
  firstName: string | null;
  lastName: string | null;
  nationality: string | null;
  city: string | null;
  country: string | null;
  university: string | null;
  faculty: string | null;
  studyLevel: string | null;
  hasBourse: boolean;
  scholarshipDecisionNumber: string | null;
  scholarshipPromotion: string | null;
}

export interface EtudiantsListFilters {
  search?: string;
  city?: string;
  university?: string;
  faculty?: string;
  studyLevel?: string;
  hasBourse?: boolean;
  userIds?: string[];
}

/**
 * Source de données étudiants — abstraction pour permettre une migration
 * future vers une plateforme tierce sans toucher au reste du module (voir
 * project decision : lecture cross-schema locale aujourd'hui, adapter
 * distant en réserve pour demain). Le reste du code ne dépend que de cette
 * interface, jamais d'une implémentation concrète.
 */
export interface EtudiantsSource {
  findByUserId(userId: string): Promise<EtudiantRaw | null>;
  list(filters: EtudiantsListFilters): Promise<EtudiantRaw[]>;
  search(query: string): Promise<EtudiantRaw[]>;
}

function toRaw(row: {
  id: string;
  email: string;
  phone: string | null;
  status: string | null;
  createdAt: Date | null;
  inue: string | null;
  firstName: string | null;
  lastName: string | null;
  nationality: string | null;
  city: string | null;
  country: string | null;
  university?: string | null;
  faculty?: string | null;
  studyLevel?: string | null;
  hasBourse?: boolean;
  scholarshipDecisionNumber?: string | null;
  scholarshipPromotion?: string | null;
}): EtudiantRaw {
  return {
    userId: row.id,
    email: row.email,
    phone: row.phone,
    accountStatus: row.status,
    registeredAt: row.createdAt,
    inue: row.inue,
    firstName: row.firstName,
    lastName: row.lastName,
    nationality: row.nationality,
    city: row.city,
    country: row.country,
    university: row.university ?? null,
    faculty: row.faculty ?? null,
    studyLevel: row.studyLevel ?? null,
    hasBourse: row.hasBourse ?? false,
    scholarshipDecisionNumber: row.scholarshipDecisionNumber ?? null,
    scholarshipPromotion: row.scholarshipPromotion ?? null,
  };
}

/**
 * Un seul select large (users JOIN user_profiles WHERE userType='student'),
 * puis attache les profils académiques + bourse en mémoire — même approche
 * que resolveTargetUserIds (schema.identity-readonly.ts), qui a déjà fait
 * ses preuves pour ce volume de données (une ambassade, pas une plateforme
 * nationale).
 */
async function fetchAcademicData(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { university: string | null; faculty: string | null; studyLevel: string | null; hasBourse: boolean; scholarshipDecisionNumber: string | null; scholarshipPromotion: string | null }>();

  const profiles = await db.select().from(identityStudentProfiles).where(inArray(identityStudentProfiles.userId, userIds));
  const profileIds = profiles.map((p) => p.id);
  const scholarships = profileIds.length
    ? await db.select().from(identityStudentScholarships).where(inArray(identityStudentScholarships.studentProfileId, profileIds))
    : [];
  const scholarshipByProfileId = new Map(scholarships.map((s) => [s.studentProfileId, s]));

  const byUserId = new Map<
    string,
    { university: string | null; faculty: string | null; studyLevel: string | null; hasBourse: boolean; scholarshipDecisionNumber: string | null; scholarshipPromotion: string | null }
  >();
  for (const p of profiles) {
    const scholarship = scholarshipByProfileId.get(p.id);
    byUserId.set(p.userId, {
      university: p.university,
      faculty: p.faculty,
      studyLevel: p.studyLevel,
      hasBourse: !!scholarship?.isRecipient,
      scholarshipDecisionNumber: scholarship?.decisionNumber ?? null,
      scholarshipPromotion: scholarship?.promotion ?? null,
    });
  }
  return byUserId;
}

export class LocalDbEtudiantsSource implements EtudiantsSource {
  async findByUserId(userId: string): Promise<EtudiantRaw | null> {
    const [row] = await db
      .select({
        id: identityUsers.id,
        email: identityUsers.email,
        phone: identityUsers.phone,
        status: identityUsers.status,
        createdAt: identityUsers.createdAt,
        inue: identityUserProfiles.inue,
        firstName: identityUserProfiles.firstName,
        lastName: identityUserProfiles.lastName,
        nationality: identityUserProfiles.nationality,
        city: identityUserProfiles.city,
        country: identityUserProfiles.country,
      })
      .from(identityUsers)
      .innerJoin(identityUserProfiles, eq(identityUserProfiles.userId, identityUsers.id))
      .where(and(eq(identityUsers.id, userId), eq(identityUserProfiles.userType, "student")));

    if (!row) return null;
    const academic = await fetchAcademicData([userId]);
    return toRaw({ ...row, ...academic.get(userId) });
  }

  async list(filters: EtudiantsListFilters): Promise<EtudiantRaw[]> {
    const conditions = [eq(identityUserProfiles.userType, "student")];
    if (filters.userIds?.length) conditions.push(inArray(identityUsers.id, filters.userIds));
    if (filters.city) conditions.push(eq(identityUserProfiles.city, filters.city));
    if (filters.search) {
      const s = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(identityUserProfiles.firstName, s),
          ilike(identityUserProfiles.lastName, s),
          ilike(identityUsers.email, s),
          ilike(identityUserProfiles.inue, s)
        )!
      );
    }

    const rows = await db
      .select({
        id: identityUsers.id,
        email: identityUsers.email,
        phone: identityUsers.phone,
        status: identityUsers.status,
        createdAt: identityUsers.createdAt,
        inue: identityUserProfiles.inue,
        firstName: identityUserProfiles.firstName,
        lastName: identityUserProfiles.lastName,
        nationality: identityUserProfiles.nationality,
        city: identityUserProfiles.city,
        country: identityUserProfiles.country,
      })
      .from(identityUsers)
      .innerJoin(identityUserProfiles, eq(identityUserProfiles.userId, identityUsers.id))
      .where(and(...conditions));

    const academic = await fetchAcademicData(rows.map((r) => r.id));
    let result = rows.map((r) => toRaw({ ...r, ...academic.get(r.id) }));

    if (filters.university) result = result.filter((e) => e.university === filters.university);
    if (filters.faculty) result = result.filter((e) => e.faculty === filters.faculty);
    if (filters.studyLevel) result = result.filter((e) => e.studyLevel === filters.studyLevel);
    if (filters.hasBourse !== undefined) result = result.filter((e) => e.hasBourse === filters.hasBourse);

    return result;
  }

  async search(query: string): Promise<EtudiantRaw[]> {
    return this.list({ search: query });
  }
}

/**
 * Squelette pour une future plateforme tierce externe (voir contexte de la
 * tâche) — non implémenté tant que cette plateforme n'existe pas. Le jour où
 * elle est disponible, cette classe appellera son API au lieu de lire
 * identity.* en local ; aucun autre fichier du module n'aura à changer.
 */
export class RemoteEtudiantsSource implements EtudiantsSource {
  async findByUserId(_userId: string): Promise<EtudiantRaw | null> {
    throw new Error("RemoteEtudiantsSource n'est pas encore implémenté — plateforme tierce non disponible.");
  }
  async list(_filters: EtudiantsListFilters): Promise<EtudiantRaw[]> {
    throw new Error("RemoteEtudiantsSource n'est pas encore implémenté — plateforme tierce non disponible.");
  }
  async search(_query: string): Promise<EtudiantRaw[]> {
    throw new Error("RemoteEtudiantsSource n'est pas encore implémenté — plateforme tierce non disponible.");
  }
}

/** ETUDIANTS_SOURCE=remote pour basculer plus tard — "local" par défaut. */
export function createEtudiantsSource(): EtudiantsSource {
  return process.env.ETUDIANTS_SOURCE === "remote" ? new RemoteEtudiantsSource() : new LocalDbEtudiantsSource();
}

export const etudiantsSource: EtudiantsSource = createEtudiantsSource();
