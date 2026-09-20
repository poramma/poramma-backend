import { z } from "zod";

/**
 * Schémas Zod pour les endpoints publics de consultation des services
 * (communaute-api) — RÈGLE-09 : toute entrée utilisateur validée par un
 * schéma Zod défini dans @poramma/dto.
 */

export const listServicesQueryDto = z.object({
  q: z.string().min(1).optional(),
});

export const availabilityQueryDto = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format YYYY-MM-DD"),
});
