import { z } from "zod";

const docType = z.enum([
  "ID_CARD",
  "PASSPORT",
  "STUDENT_CERT",
  "CONSULAR_CARD",
  "STUDENT_CARD",
  "PHOTO",
  "PROOF_ADDRESS",
  "BIRTH_CERT",
  "NATIONALITY_CERT",
  "SCHOLARSHIP_PROOF",
  "OTHER",
]);

const docStatus = z.enum(["UPLOADED", "IN_REVIEW", "ACCEPTED", "REJECTED", "EXPIRED"]);

export const createCategoryDto = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().nullable().optional(),
  allowedTypes: z.array(docType).min(1),
  requiresValidation: z.boolean().optional(),
  maxVersions: z.number().int().min(1).optional(),
  retentionDays: z.number().int().min(1).nullable().optional(),
});

export const updateCategoryDto = createCategoryDto.partial();

export const listDocumentsQueryDto = z.object({
  status: docStatus.optional(),
  type: docType.optional(),
  categoryId: z.string().optional(),
  ownerUserId: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// multipart/form-data: multer parses the file separately, this validates
// the accompanying text fields (req.body).
export const uploadDocumentDto = z.object({
  type: docType,
  ownerUserId: z.string().uuid(),
  categoryId: z.string().nullable().optional(),
  expiryDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  demandeId: z.string().nullable().optional(),
  requirementId: z.string().nullable().optional(),
});

export const validateDocumentDto = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
  reviewNote: z.string().optional(),
});

export const auditQueryDto = z.object({
  documentId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
