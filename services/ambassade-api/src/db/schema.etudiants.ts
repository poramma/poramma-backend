// Tables "etudiants"/"inue_sequences" déplacées dans @poramma/ambassade-core
// (partagées avec communaute-api). Ce fichier ne fait que ré-exporter pour
// ne pas casser les imports existants (`from "./schema.etudiants"`).
import { etudiantsSchema } from "@poramma/ambassade-core";

export const etudiants = etudiantsSchema.etudiants;
export const inueSequences = etudiantsSchema.inueSequences;
