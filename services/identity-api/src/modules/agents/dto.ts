import { z } from "zod";

const departmentEnum = z.enum([
  "CONSULAR",
  "ADMINISTRATIVE",
  "FINANCIAL",
  "COMMUNICATION",
  "SECURITY",
  "STUDIES",
]);

// No self-registration for agents (see mission prompt section 4.2 / USR-06):
// an ADMIN creates the account, no OTP step. `password` is optional — if
// omitted, a temporary one is generated and emailed.
export const createAgentDto = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  phone: z.string().nullable().optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  matricule: z.string().min(1),
  roleTitle: z.string().nullable().optional(),
  department: departmentEnum,
  officeNumber: z.string().nullable().optional(),
  roleId: z.string().uuid(),
  active: z.boolean().optional(),
});

// Role reassignment goes through POST/DELETE /users/:userId/roles/:roleId
// (Phase 2) instead of being folded into this endpoint — one pathway for
// role changes, not two that could disagree.
export const updateAgentDto = z.object({
  email: z.string().email().optional(),
  phone: z.string().nullable().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  matricule: z.string().min(1).optional(),
  roleTitle: z.string().nullable().optional(),
  department: departmentEnum.optional(),
  officeNumber: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

export const listAgentsQueryDto = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  department: departmentEnum.optional(),
  role: z.string().optional(),
});
