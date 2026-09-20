import { and, eq, notInArray } from "drizzle-orm";
import { ConflictError, ValidationError } from "@poramma/utils";
import type { Db } from "../db-type";
import { etudiants } from "../schema/etudiants";
import { documents } from "../schema/documents";
import {
  identityUserProfiles,
  identityStudentProfiles,
  identityStudentScholarships,
  identityWorkerProfiles,
} from "../schema/identity";
import { ensureEtudiantRecord } from "./etudiants";
import { writeAudit } from "./audit";

export type UserType = "student" | "worker" | "migrant" | "other";

export type RegistrationStatus = "INCOMPLETE" | "SUBMITTED" | "VALIDATED" | "REJECTED" | "SUSPENDED";

interface RequiredDocument {
  key: string;
  label: string;
  acceptedTypes: string[];
  optional?: boolean;
}

/**
 * Pièces demandées pour l'enregistrement auprès de l'ambassade, selon le type
 * de profil (contexte Poramma §4 étape 6). Volontairement en code et non en
 * base : ce n'est pas un catalogue de service (pas de sous-service associé),
 * c'est la règle d'inscription elle-même.
 */
function requiredDocumentsFor(userType: UserType, isScholarshipRecipient: boolean): RequiredDocument[] {
  const docs: RequiredDocument[] = [
    {
      key: "identity",
      label: "Pièce d'identité (carte d'identité malienne ou passeport)",
      acceptedTypes: ["ID_CARD", "PASSPORT"],
    },
  ];
  if (userType === "student") {
    docs.push({ key: "school", label: "Certificat de scolarité", acceptedTypes: ["STUDENT_CERT", "STUDENT_CARD"] });
    if (isScholarshipRecipient) {
      docs.push({ key: "scholarship", label: "Justificatif de bourse", acceptedTypes: ["SCHOLARSHIP_PROOF"] });
    }
  }
  docs.push({ key: "consular", label: "Carte consulaire (si vous en avez une)", acceptedTypes: ["CONSULAR_CARD"], optional: true });
  docs.push({ key: "address", label: "Justificatif de domicile au Maroc", acceptedTypes: ["PROOF_ADDRESS"], optional: true });
  return docs;
}

export function computeRegistrationStatus(row: { status: string; submittedAt: Date | null }): RegistrationStatus {
  if (row.status === "VALIDATED") return "VALIDATED";
  if (row.status === "REJECTED") return "REJECTED";
  if (row.status === "SUSPENDED") return "SUSPENDED";
  return row.submittedAt ? "SUBMITTED" : "INCOMPLETE";
}

/**
 * État complet du dossier d'enregistrement d'un membre de la communauté :
 * statut, ce qui manque côté informations, ce qui manque côté pièces.
 * Ne renvoie aucune donnée d'identité agent (revue par un agent = simple
 * note `reviewNote`, sans nom ni identifiant).
 */
export async function getRegistrationChecklist(db: Db, userId: string) {
  const tracking = await ensureEtudiantRecord(db, userId);

  const [profile] = await db.select().from(identityUserProfiles).where(eq(identityUserProfiles.userId, userId));
  const userType = ((profile?.userType as UserType | null) ?? "other") as UserType;

  const missingInfo: string[] = [];
  if (!profile?.firstName) missingInfo.push("Prénom");
  if (!profile?.lastName) missingInfo.push("Nom");
  if (!profile?.city) missingInfo.push("Ville de résidence au Maroc");

  let isScholarshipRecipient = false;
  if (userType === "student") {
    const [student] = await db.select().from(identityStudentProfiles).where(eq(identityStudentProfiles.userId, userId));
    if (!student?.university) missingInfo.push("Université ou établissement");
    if (!student?.faculty) missingInfo.push("Faculté ou filière");
    if (!student?.studyLevel) missingInfo.push("Niveau d'études");
    if (student) {
      const [scholarship] = await db
        .select()
        .from(identityStudentScholarships)
        .where(eq(identityStudentScholarships.studentProfileId, student.id));
      isScholarshipRecipient = !!scholarship?.isRecipient;
    }
  } else if (userType === "worker") {
    const [worker] = await db.select().from(identityWorkerProfiles).where(eq(identityWorkerProfiles.userId, userId));
    if (!worker?.employer) missingInfo.push("Employeur");
    if (!worker?.profession) missingInfo.push("Profession");
  }

  // Pièces déjà déposées (hors rejetées/expirées, qui ne comptent plus).
  const userDocs = await db
    .select({ id: documents.id, type: documents.type, status: documents.status })
    .from(documents)
    .where(and(eq(documents.ownerUserId, userId), notInArray(documents.status, ["REJECTED", "EXPIRED"])));

  const documentChecklist = requiredDocumentsFor(userType, isScholarshipRecipient).map((req) => {
    const match = userDocs.find((d) => req.acceptedTypes.includes(d.type));
    return {
      key: req.key,
      label: req.label,
      acceptedTypes: req.acceptedTypes,
      optional: !!req.optional,
      provided: !!match,
      documentId: match?.id ?? null,
      documentStatus: match?.status ?? null,
    };
  });
  const missingDocuments = documentChecklist.filter((d) => !d.optional && !d.provided).map((d) => d.label);

  const registrationStatus = computeRegistrationStatus(tracking);
  const canSubmit =
    missingInfo.length === 0 &&
    missingDocuments.length === 0 &&
    (registrationStatus === "INCOMPLETE" || registrationStatus === "REJECTED");

  return {
    registrationStatus,
    status: tracking.status as "PENDING" | "VALIDATED" | "REJECTED" | "SUSPENDED",
    isValidated: tracking.status === "VALIDATED",
    submittedAt: tracking.submittedAt,
    inue: tracking.inue,
    inueAssignedAt: tracking.inueAssignedAt,
    reviewNote: tracking.reviewNote,
    reviewedAt: tracking.reviewedAt,
    userType,
    info: { complete: missingInfo.length === 0, missing: missingInfo },
    documents: { complete: missingDocuments.length === 0, missing: missingDocuments, items: documentChecklist },
    canSubmit,
  };
}

/**
 * Soumet le dossier d'enregistrement à l'ambassade. Possible depuis
 * INCOMPLETE ou REJECTED (nouvelle soumission après correction) — pas depuis
 * SUBMITTED (déjà en cours d'examen), VALIDATED ou SUSPENDED (décision
 * d'un agent, pas modifiable par le citoyen).
 */
export async function submitRegistration(db: Db, userId: string) {
  const checklist = await getRegistrationChecklist(db, userId);

  if (checklist.registrationStatus === "SUBMITTED") {
    throw new ConflictError("Votre dossier est déjà en cours d'examen par l'ambassade.");
  }
  if (checklist.registrationStatus === "VALIDATED") {
    throw new ConflictError("Votre enregistrement est déjà validé.");
  }
  if (checklist.registrationStatus === "SUSPENDED") {
    throw new ConflictError("Votre dossier est suspendu — contactez l'ambassade.");
  }
  if (!checklist.canSubmit) {
    const details: Record<string, string[]> = {};
    if (checklist.info.missing.length) details.informations = checklist.info.missing;
    if (checklist.documents.missing.length) details.documents = checklist.documents.missing;
    throw new ValidationError("Votre dossier est incomplet.", details);
  }

  await db.transaction(async (tx) => {
    const conn = tx as unknown as Db;
    await conn
      .update(etudiants)
      .set({ status: "PENDING", submittedAt: new Date(), updatedAt: new Date() })
      .where(eq(etudiants.userId, userId));
    await writeAudit(conn, {
      action: "SUBMIT_REGISTRATION",
      entityType: "ETUDIANT",
      entityId: (await conn.select({ id: etudiants.id }).from(etudiants).where(eq(etudiants.userId, userId)))[0].id,
      actor: { userId, roleName: null },
      details: { userType: checklist.userType, resubmission: checklist.registrationStatus === "REJECTED" },
    });
  });

  return getRegistrationChecklist(db, userId);
}
