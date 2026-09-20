import { z } from "zod";

export const createDemandeDto = z.object({
  subServiceId: z.string().min(1),
  // Champs propres au sous-service (nom, date de naissance, commentaire...) —
  // libres côté catalogue, validés par la structure seulement.
  customPayload: z.record(z.unknown()).nullable().optional(),
  // Pièces déjà téléversées (POST /documents) à joindre au dossier.
  // requirementId = id du prérequis du catalogue (GET /sub-services/:id).
  documents: z
    .array(
      z.object({
        requirementId: z.string().min(1).nullable().optional(),
        documentId: z.string().min(1),
      })
    )
    .max(30)
    .optional(),
});

export const addCommentDto = z.object({
  content: z.string().min(1).max(2000),
});
