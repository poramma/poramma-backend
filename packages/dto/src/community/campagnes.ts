import { z } from "zod";

const campagneType = z.enum(["INFO", "ALERT", "EVENT", "SURVEY", "REMINDER"]);

/** GET /campagnes?type=&limit=&offset= */
export const listCampagnesQueryDto = z.object({
  type: campagneType.optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).max(1000).optional(),
});

/**
 * POST /campagnes/:id/click — `targetId` est l'id d'une pièce jointe de la
 * campagne, ou « link:<url> » pour un lien du texte (vérifié côté serveur).
 */
export const clickCampagneDto = z.object({
  targetId: z.string().min(1).max(200),
});

/** POST /campagnes/:id/reactions/:type */
export const reactionTypeDto = z.enum(["LIKE", "PARTICIPATE"]);
