import { z } from "zod";

export const listThreadsQueryDto = z.object({
  demandeId: z.string().optional(),
});

export const createThreadDto = z.object({
  demandeId: z.string().optional(),
  subject: z.string().min(1),
  participantIds: z.array(z.string().uuid()).default([]),
});

export const addParticipantDto = z.object({
  userId: z.string().uuid(),
});

export const updateThreadStatusDto = z.object({
  status: z.enum(["OPEN", "CLOSED", "ESCALATED"]),
});

// multipart: `body` est un champ texte, les fichiers arrivent via multer
// (voir messaging.controller.ts) — pas de validation zod sur le fichier
// lui-même, mêmes contraintes mime/taille que les pièces jointes de
// campagne.
export const sendMessageDto = z.object({
  body: z.string().min(1),
});
