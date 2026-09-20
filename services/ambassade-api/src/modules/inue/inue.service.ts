import { db } from "../../db/connection";
import { etudiants, inueSequences } from "../../db/schema.etudiants";
import { eq } from "drizzle-orm";
import { ConflictError, NotFoundError } from "@poramma/utils";
import { writeAudit } from "../audit/audit.service";

interface Actor {
  userId: string;
  roleName: string | null;
}

export function formatInue(year: number, sequence: number): string {
  return `${year}${String(sequence).padStart(4, "0")}`;
}

/**
 * Attribue un INUE à un étudiant (ligne `etudiants` déjà existante,
 * identifiée par son id ambassade-api) pour l'année donnée.
 *
 * Transaction stricte, race-safe : verrouille d'abord la ligne étudiant
 * (SELECT ... FOR UPDATE) — sérialise deux tentatives concurrentes SUR LE
 * MÊME étudiant (idempotence) — puis verrouille (ou crée) la ligne de
 * séquence de l'année — sérialise deux attributions concurrentes
 * D'ÉTUDIANTS DIFFÉRENTS sur la même année, qui est le vrai risque de
 * collision. Les deux verrous sont tenus jusqu'au COMMIT/ROLLBACK de la
 * transaction Postgres, donc aucune requête concurrente ne peut lire un état
 * intermédiaire.
 *
 * L'entrée d'audit est écrite dans LA MÊME transaction que l'attribution
 * (voir writeAudit's `tx` param) : soit les deux sont persistées, soit
 * aucune ne l'est.
 */
export async function assignInue(
  etudiantId: string,
  year: number,
  actor: Actor
): Promise<{ inue: string; year: number; sequence: number }> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new ConflictError(`Année INUE invalide: ${year}`);
  }

  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(etudiants).where(eq(etudiants.id, etudiantId)).for("update");
    if (!existing) throw new NotFoundError("Étudiant introuvable");
    if (existing.inue) {
      throw new ConflictError(`INUE déjà attribué à cet étudiant (${existing.inue})`);
    }

    let [seqRow] = await tx.select().from(inueSequences).where(eq(inueSequences.year, year)).for("update");
    if (!seqRow) {
      const inserted = await tx.insert(inueSequences).values({ year, lastNumber: 0 }).onConflictDoNothing().returning();
      if (inserted.length > 0) {
        seqRow = inserted[0];
      } else {
        // Course rarissime : une transaction concurrente a créé la ligne
        // entre notre SELECT et notre INSERT — la relire, verrouillée cette
        // fois (elle attendra le verrou FOR UPDATE de l'autre transaction).
        [seqRow] = await tx.select().from(inueSequences).where(eq(inueSequences.year, year)).for("update");
      }
    }
    if (!seqRow) {
      throw new ConflictError(`Conflit de séquence INUE pour l'année ${year} — incident critique à investiguer`);
    }

    const nextNumber = seqRow.lastNumber + 1;
    if (nextNumber > 9999) {
      throw new ConflictError(`Séquence INUE épuisée pour l'année ${year} (9999 attributions atteintes)`);
    }

    await tx.update(inueSequences).set({ lastNumber: nextNumber }).where(eq(inueSequences.year, year));

    const inue = formatInue(year, nextNumber);

    // Vérification défensive : ne devrait jamais se déclencher si le
    // verrouillage ci-dessus tient, mais protège contre une collision
    // théorique (donnée corrompue, INUE inséré hors de ce chemin).
    const [collision] = await tx.select().from(etudiants).where(eq(etudiants.inue, inue));
    if (collision) {
      throw new ConflictError(`Collision INUE détectée pour ${inue} — incident critique à investiguer`);
    }

    await tx
      .update(etudiants)
      .set({ inue, inueAssignedAt: new Date(), inueAssignedBy: actor.userId, updatedAt: new Date() })
      .where(eq(etudiants.id, etudiantId));

    await writeAudit({
      action: "ASSIGN_INUE",
      entityType: "ETUDIANT",
      entityId: etudiantId,
      actor,
      details: { inue, year, sequence: nextNumber },
      tx,
    });

    return { inue, year, sequence: nextNumber };
  });
}
