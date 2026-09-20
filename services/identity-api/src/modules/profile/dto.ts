import { z } from "zod";

export const updateOwnProfileDto = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  dateOfBirth: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
});

export const updatePreferencesDto = z.object({
  theme: z.enum(["light", "dark", "system"]).optional(),
  language: z.enum(["fr", "bm"]).optional(),
  notificationsEmail: z.boolean().optional(),
  notificationsInApp: z.boolean().optional(),
  notificationTypes: z
    .object({
      demandeAssigned: z.boolean().optional(),
      documentPending: z.boolean().optional(),
      rendezVousReminder: z.boolean().optional(),
    })
    .optional(),
});

export const updatePasswordDto = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const activitiesQueryDto = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
