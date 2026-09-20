import { z } from "zod";

const docType = z.enum([
  "ID_CARD",
  "PASSPORT",
  "STUDENT_CERT",
  "CONSULAR_CARD",
  "STUDENT_CARD",
  "PHOTO",
  "PROOF_ADDRESS",
  "BIRTH_CERT",
  "NATIONALITY_CERT",
  "SCHOLARSHIP_PROOF",
  "OTHER",
]);

// Pas de ownerUserId ici : toujours soi-même côté communaute-api (forcé
// server-side, jamais fait confiance à une valeur client) — contrairement à
// ambassade-api où un agent peut uploader pour un tiers.
export const uploadDocumentDto = z.object({
  type: docType,
  demandeId: z.string().nullable().optional(),
  requirementId: z.string().nullable().optional(),
});
