import { z } from "zod";

const targetFiltersSchema = z.object({
  cities: z.array(z.string()).optional(),
  statuses: z.array(z.string()).optional(),
  studyLevels: z.array(z.string()).optional(),
  faculties: z.array(z.string()).optional(),
  hasBourse: z.boolean().optional(),
  universities: z.array(z.string()).optional(),
  userIds: z.array(z.string()).optional(),
});

export const createCampagneDto = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  type: z.enum(["INFO", "ALERT", "EVENT", "SURVEY", "REMINDER"]),
  coverImageFileId: z.string().optional(),
  targetFilters: targetFiltersSchema.default({}),
  scheduledAt: z.string().datetime().optional(),
  channels: z.array(z.enum(["IN_APP", "EMAIL", "SMS", "PUSH", "WHATSAPP"])).default(["IN_APP"]),
});

export const updateCampagneDto = createCampagneDto.partial();

export const listCampagnesQueryDto = z.object({
  status: z.enum(["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED", "CANCELLED"]).optional(),
  type: z.enum(["INFO", "ALERT", "EVENT", "SURVEY", "REMINDER"]).optional(),
});

export const estimateRecipientsDto = targetFiltersSchema;

/** Un champ multipart arrive en texte : « true » / « false » sont acceptés en plus d'un vrai booléen. */
const booleanish = z.preprocess((v) => (v === "true" ? true : v === "false" ? false : v), z.boolean());

export const uploadAttachmentDto = z.object({
  type: z.enum(["IMAGE", "VIDEO", "DOCUMENT"]),
  caption: z.string().optional(),
  // Affichée dans le carrousel « bannière » (image ou vidéo uniquement).
  isBanner: booleanish.optional(),
});

export const updateAttachmentDto = z
  .object({
    isBanner: z.boolean().optional(),
    caption: z.string().max(300).nullable().optional(),
  })
  .refine((v) => v.isBanner !== undefined || v.caption !== undefined, { message: "Aucune modification demandée" });

export const reorderAttachmentsDto = z.object({
  orderedAttachmentIds: z.array(z.string()).min(1),
});

export const scheduleCampagneDto = z.object({
  scheduledAt: z.string().datetime(),
});
