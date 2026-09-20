import { z } from "zod";

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format attendu : AAAA-MM-JJ");
const timeStr = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format attendu : HH:MM");

/** GET /rendez-vous/slots?subServiceId=&date= */
export const slotsQueryDto = z.object({ subServiceId: z.string().min(1), date: dateStr });

/** GET /rendez-vous/available-dates?subServiceId=&days= */
export const availableDatesQueryDto = z.object({
  subServiceId: z.string().min(1),
  days: z.coerce.number().int().min(1).max(60).optional(),
});

/**
 * Le citoyen choisit un service, une date et une heure — jamais un agent
 * (l'agent est attribué côté serveur et n'est jamais exposé).
 */
export const bookRendezVousDto = z.object({
  subServiceId: z.string().min(1),
  date: dateStr,
  startTime: timeStr,
  motif: z.string().max(500).nullable().optional(),
  // Demande à laquelle ce rendez-vous se rattache (optionnel ; doit appartenir au citoyen).
  demandeId: z.string().min(1).nullable().optional(),
});

export const rescheduleRendezVousDto = z.object({
  date: dateStr,
  startTime: timeStr,
});

export const cancelRendezVousDto = z.object({
  reason: z.string().max(500).nullable().optional(),
});

/** POST /rendez-vous/:id/notes — message du citoyen à l'ambassade au sujet de son rendez-vous. */
export const addRendezVousNoteDto = z.object({
  content: z.string().min(1).max(1000),
});
