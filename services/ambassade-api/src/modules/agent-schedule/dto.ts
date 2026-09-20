import { z } from "zod";

export const createAssignmentDto = z.object({
  subServiceId: z.string().min(1),
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
  isPrimary: z.boolean().optional(),
  maxDailyAppointments: z.number().int().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const updateAssignmentDto = createAssignmentDto.partial().extend({
  active: z.boolean().optional(),
});

export const createAvailabilityDto = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  isAvailable: z.boolean().optional(),
  validFrom: z.string().nullable().optional(),
  validUntil: z.string().nullable().optional(),
});

export const updateAvailabilityDto = createAvailabilityDto.partial();

export const createExceptionDto = z.object({
  date: z.string(),
  type: z.enum(["ABSENCE", "TRAINING", "HOLIDAY", "MISSION", "OTHER"]),
  reason: z.string().min(1),
  isFullDay: z.boolean().optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
});
