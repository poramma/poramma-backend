import { z } from "zod";

const appStatus = z.enum([
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "ADDITIONAL_INFO_REQUIRED",
  "UNDER_VERIFICATION",
  "APPROVED",
  "REJECTED",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
]);

const priority = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

const requirementStatus = z.enum(["PENDING", "PROVIDED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"]);

export const createDemandeDto = z.object({
  userId: z.string().uuid(),
  subServiceId: z.string().min(1),
  priority: priority.optional(),
  totalAmount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  customPayload: z.record(z.unknown()).nullable().optional(),
});

export const listDemandesQueryDto = z.object({
  status: appStatus.optional(),
  priority: priority.optional(),
  subServiceId: z.string().optional(),
  assignedAgentId: z.string().optional(),
  dossierNumber: z.string().optional(),
  search: z.string().optional(),
  isOverdue: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const updateStatusDto = z.object({
  status: appStatus,
  comment: z.string().min(1),
  isVisibleToUser: z.boolean(),
  assignedAgentId: z.string().uuid().optional(),
});

export const assignDto = z.object({
  agentId: z.string().uuid(),
  note: z.string().optional(),
});

export const addCommentDto = z.object({
  content: z.string().min(1),
  isInternal: z.boolean().optional(),
});

export const validateRequirementDto = z.object({
  status: requirementStatus,
  note: z.string().optional(),
});
