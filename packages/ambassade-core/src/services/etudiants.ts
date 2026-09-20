import crypto from "crypto";
import { eq } from "drizzle-orm";
import type { Db } from "../db-type";
import { etudiants } from "../schema/etudiants";
import { writeAudit } from "./audit";

type EtudiantRow = typeof etudiants.$inferSelect;

function newId(): string {
  return `etu-${crypto.randomUUID()}`;
}

/**
 * Récupère (ou crée, au premier contact) la ligne de suivi de validation
 * pour cet utilisateur — c'est ce premier appel, quel que soit l'endroit
 * d'où il vient (détail agent, consultation citoyen de son propre statut,
 * validation...), qui écrit l'entrée d'audit "INSCRIPTION" (le système
 * constate l'inscription, pas un agent).
 */
export async function ensureEtudiantRecord(db: Db, userId: string): Promise<EtudiantRow> {
  const [existing] = await db.select().from(etudiants).where(eq(etudiants.userId, userId));
  if (existing) return existing;

  const inserted = await db
    .insert(etudiants)
    .values({ id: newId(), userId, status: "PENDING" })
    .onConflictDoNothing()
    .returning();

  if (inserted.length > 0) {
    await writeAudit(db, {
      action: "INSCRIPTION",
      entityType: "ETUDIANT",
      entityId: inserted[0].id,
      actor: null,
      details: { userId },
    });
    return inserted[0];
  }

  // Course : une autre requête a créé la ligne entre-temps.
  const [row] = await db.select().from(etudiants).where(eq(etudiants.userId, userId));
  return row;
}

/**
 * Statut d'inscription "public" — ce dont communaute-api a besoin pour
 * afficher le statut à l'utilisateur et gater rendez-vous/demandes/threads
 * (voir requireValidatedProfile). Ne renvoie aucune donnée d'identité brute
 * (nom, email...) — ça reste la responsabilité d'identity-api.
 */
export async function getRegistrationStatus(db: Db, userId: string) {
  const tracking = await ensureEtudiantRecord(db, userId);
  return {
    status: tracking.status as "PENDING" | "VALIDATED" | "REJECTED" | "SUSPENDED",
    isValidated: tracking.status === "VALIDATED",
    submittedAt: tracking.submittedAt,
    inue: tracking.inue,
    inueAssignedAt: tracking.inueAssignedAt,
    reviewNote: tracking.reviewNote,
    reviewedAt: tracking.reviewedAt,
  };
}
