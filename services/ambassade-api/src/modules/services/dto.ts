import { z } from "zod";

export const createServiceDto = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
  requiresAppointment: z.boolean().optional(),
});

export const updateServiceDto = createServiceDto.partial();

export const createSubServiceDto = z.object({
  serviceId: z.string().min(1),
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().nullable().optional(),
  active: z.boolean().optional(),
  basePrice: z.number().nullable().optional(),
  currency: z.string().optional(),
  slaDays: z.number().int().min(0),
  allowCustomRequest: z.boolean().optional(),
  requiresInPerson: z.boolean().optional(),
});

export const updateSubServiceDto = createSubServiceDto.partial().omit({ serviceId: true });

export const createScheduleDto = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  startTime: z.string(),
  endTime: z.string(),
  slotDurationMinutes: z.number().int().min(1).optional(),
  maxConcurrentSlots: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().nullable().optional(),
});

export const updateScheduleDto = createScheduleDto.partial();

export const createExceptionDto = z.object({
  date: z.string(),
  type: z.enum(["CLOSED", "SPECIAL_HOURS", "EXTRA_CAPACITY"]),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  reason: z.string().min(1),
});

export const createRequirementDto = z.object({
  type: z.enum(["DOCUMENT", "FIELD", "FEE", "PHOTO", "SIGNATURE"]),
  label: z.string().min(1),
  key: z.string().min(1),
  description: z.string().nullable().optional(),
  required: z.boolean().optional(),
  order: z.number().int().optional(),
  schema: z.record(z.unknown()).nullable().optional(),
});

export const updateRequirementDto = createRequirementDto.partial();
