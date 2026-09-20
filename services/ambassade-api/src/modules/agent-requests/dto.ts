import { z } from "zod";

const ACCESS_CATEGORIES = ["SERVICE_ACCESS", "PERMISSION_CHANGE", "ROLE_CHANGE", "OTHER"] as const;
const REPORT_CATEGORIES = ["ASSIGNMENT_ISSUE", "PERMISSION_ISSUE", "DATA_ISSUE", "SECURITY", "OTHER"] as const;

export const createAgentRequestDto = z
  .object({
    kind: z.enum(["ACCESS_REQUEST", "REPORT"]),
    category: z.enum(["SERVICE_ACCESS", "PERMISSION_CHANGE", "ROLE_CHANGE", "ASSIGNMENT_ISSUE", "PERMISSION_ISSUE", "DATA_ISSUE", "SECURITY", "OTHER"]),
    subject: z.string().trim().min(3, "Objet trop court").max(200),
    description: z.string().trim().min(10, "Décrivez votre demande (10 caractères minimum)").max(3000),
    targetSubServiceId: z.string().min(1).optional(),
    targetPermission: z.string().max(100).optional(),
  })
  .superRefine((v, ctx) => {
    const allowed: readonly string[] = v.kind === "ACCESS_REQUEST" ? ACCESS_CATEGORIES : REPORT_CATEGORIES;
    if (!allowed.includes(v.category)) {
      ctx.addIssue({ code: "custom", path: ["category"], message: "Catégorie incompatible avec ce type de demande" });
    }
    if (v.category === "SERVICE_ACCESS" && !v.targetSubServiceId) {
      ctx.addIssue({ code: "custom", path: ["targetSubServiceId"], message: "Choisissez le service concerné" });
    }
  });

export const listAgentRequestsQueryDto = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED", "RESOLVED"]).optional(),
  kind: z.enum(["ACCESS_REQUEST", "REPORT"]).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const processAgentRequestDto = z.object({
  status: z.enum(["IN_PROGRESS", "APPROVED", "REJECTED", "RESOLVED"]),
  response: z.string().trim().max(2000).optional(),
  // Pour une demande d'accès à un service approuvée : crée l'affectation dans la foulée.
  applyAssignment: z.boolean().optional(),
});
