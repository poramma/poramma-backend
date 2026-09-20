import { z } from "zod";

export const listEtudiantsQueryDto = z.object({
  search: z.string().optional(),
  status: z.enum(["PENDING", "VALIDATED", "REJECTED", "SUSPENDED"]).optional(),
  city: z.string().optional(),
  university: z.string().optional(),
  faculty: z.string().optional(),
  studyLevel: z.string().optional(),
  hasBourse: z.coerce.boolean().optional(),
  hasInue: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  sortBy: z.enum(["name", "registeredAt", "status"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const searchEtudiantsQueryDto = z.object({
  q: z.string().min(1),
});

export const validateEtudiantDto = z.object({
  comment: z.string().optional(),
});

export const rejectEtudiantDto = z.object({
  reason: z.string().min(1, "Le motif de rejet est requis"),
});

export const suspendEtudiantDto = z.object({
  reason: z.string().min(1, "Le motif de suspension est requis"),
});

export const estimateEtudiantsDto = z.object({
  city: z.string().optional(),
  university: z.string().optional(),
  faculty: z.string().optional(),
  studyLevel: z.string().optional(),
  hasBourse: z.boolean().optional(),
  status: z.enum(["PENDING", "VALIDATED", "REJECTED", "SUSPENDED"]).optional(),
});
