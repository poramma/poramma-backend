import { z } from "zod";

const rdvStatus = z.enum([
  "PENDING",
  "CONFIRMED",
  "CHECKED_IN",
  "IN_PROGRESS",
  "COMPLETED",
  "MISSED",
  "CANCELLED_BY_USER",
  "CANCELLED_BY_AGENT",
  "NO_SHOW",
]);

const rdvType = z.enum(["STANDARD", "URGENCE", "PRIORITAIRE", "SUIVI"]);

export const agendaSlotsQueryDto = z.object({
  date: z.string(),
  subServiceId: z.string().optional(),
  agentId: z.string().uuid().optional(),
});

export const listRendezVousQueryDto = z.object({
  date: z.string().optional(),
  agentId: z.string().uuid().optional(),
  subServiceId: z.string().optional(),
  status: rdvStatus.optional(),
  type: rdvType.optional(),
  userId: z.string().uuid().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
});

export const createRendezVousDto = z.object({
  userId: z.string().uuid(),
  subServiceId: z.string().min(1),
  // Le RDV se prend pour un service, pas un agent précis : l'agent réel est
  // dérivé server-side du slotId (voir rendezvous.service.ts createRendezVous).
  agentId: z.string().uuid().optional(),
  slotId: z.string().min(1),
  motif: z.string().nullable().optional(),
  demandeId: z.string().nullable().optional(),
});

export const createUrgenceDto = z.object({
  userId: z.string().uuid(),
  subServiceId: z.string().min(1),
  agentId: z.string().uuid(),
  motif: z.string().min(1),
  urgenceJustification: z.string().min(1),
  demandeId: z.string().nullable().optional(),
});

export const updateStatusDto = z.object({
  status: rdvStatus,
  comment: z.string().optional(),
});

export const completeDto = z.object({
  notes: z.string().optional(),
});

export const cancelDto = z.object({
  reason: z.string().min(1),
  cancelledBy: z.enum(["USER", "AGENT"]).optional(),
});

export const printDailyDto = z.object({
  date: z.string(),
  agentId: z.string().uuid().nullable().optional(),
  subServiceId: z.string().nullable().optional(),
  format: z.enum(["PDF", "THERMAL"]).default("PDF"),
});

export const printHistoryQueryDto = z.object({
  date: z.string(),
});

export const addNoteDto = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().optional(),
});
