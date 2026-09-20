// Tables "demandes" déplacées dans @poramma/ambassade-core (partagées avec
// communaute-api). Ce fichier ne fait que ré-exporter pour ne pas casser
// les imports existants (`from "./schema.demandes"`).
import { demandesSchema } from "@poramma/ambassade-core";

export const demandes = demandesSchema.demandes;
export const demandeRequirements = demandesSchema.demandeRequirements;
export const demandeDocuments = demandesSchema.demandeDocuments;
export const demandeHistories = demandesSchema.demandeHistories;
export const demandeComments = demandesSchema.demandeComments;
