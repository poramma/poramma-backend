import { z } from "zod";

const confidentiality = z.enum(["PUBLIC", "INTERNAL", "RESTRICTED", "CONFIDENTIAL"]);

export const listInternalDocumentsQueryDto = z.object({
  department: z.string().optional(),
  confidentiality: confidentiality.optional(),
  search: z.string().optional(),
});

// multipart/form-data: multer parses the file separately, this validates
// the accompanying text fields (req.body). `tags` arrives as a JSON string
// since FormData can't carry arrays natively.
export const createInternalDocumentDto = z.object({
  title: z.string().min(1),
  department: z.string().min(1),
  confidentiality,
  tags: z
    .string()
    .optional()
    .transform((s) => {
      if (!s) return [];
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
      } catch {
        return [];
      }
    }),
});

export const shareInternalDocumentDto = z.object({
  targetAgentIds: z.array(z.string().uuid()).default([]),
  targetRoleIds: z.array(z.string().uuid()).default([]),
});
