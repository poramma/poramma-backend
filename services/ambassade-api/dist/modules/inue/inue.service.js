"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatInue = formatInue;
exports.assignInue = assignInue;
const connection_1 = require("../../db/connection");
const schema_etudiants_1 = require("../../db/schema.etudiants");
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const audit_service_1 = require("../audit/audit.service");
function formatInue(year, sequence) {
    return `${year}${String(sequence).padStart(4, "0")}`;
}
async function assignInue(etudiantId, year, actor) {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
        throw new utils_1.ConflictError(`Année INUE invalide: ${year}`);
    }
    return connection_1.db.transaction(async (tx) => {
        const [existing] = await tx.select().from(schema_etudiants_1.etudiants).where((0, drizzle_orm_1.eq)(schema_etudiants_1.etudiants.id, etudiantId)).for("update");
        if (!existing)
            throw new utils_1.NotFoundError("Étudiant introuvable");
        if (existing.inue) {
            throw new utils_1.ConflictError(`INUE déjà attribué à cet étudiant (${existing.inue})`);
        }
        let [seqRow] = await tx.select().from(schema_etudiants_1.inueSequences).where((0, drizzle_orm_1.eq)(schema_etudiants_1.inueSequences.year, year)).for("update");
        if (!seqRow) {
            const inserted = await tx.insert(schema_etudiants_1.inueSequences).values({ year, lastNumber: 0 }).onConflictDoNothing().returning();
            if (inserted.length > 0) {
                seqRow = inserted[0];
            }
            else {
                [seqRow] = await tx.select().from(schema_etudiants_1.inueSequences).where((0, drizzle_orm_1.eq)(schema_etudiants_1.inueSequences.year, year)).for("update");
            }
        }
        if (!seqRow) {
            throw new utils_1.ConflictError(`Conflit de séquence INUE pour l'année ${year} — incident critique à investiguer`);
        }
        const nextNumber = seqRow.lastNumber + 1;
        if (nextNumber > 9999) {
            throw new utils_1.ConflictError(`Séquence INUE épuisée pour l'année ${year} (9999 attributions atteintes)`);
        }
        await tx.update(schema_etudiants_1.inueSequences).set({ lastNumber: nextNumber }).where((0, drizzle_orm_1.eq)(schema_etudiants_1.inueSequences.year, year));
        const inue = formatInue(year, nextNumber);
        const [collision] = await tx.select().from(schema_etudiants_1.etudiants).where((0, drizzle_orm_1.eq)(schema_etudiants_1.etudiants.inue, inue));
        if (collision) {
            throw new utils_1.ConflictError(`Collision INUE détectée pour ${inue} — incident critique à investiguer`);
        }
        await tx
            .update(schema_etudiants_1.etudiants)
            .set({ inue, inueAssignedAt: new Date(), inueAssignedBy: actor.userId, updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(schema_etudiants_1.etudiants.id, etudiantId));
        await (0, audit_service_1.writeAudit)({
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
//# sourceMappingURL=inue.service.js.map