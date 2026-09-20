import { z } from "zod";

export const listAuditLogsQueryDto = z.object({
  actorUserId: z.string().uuid().optional(),
  actorRole: z.string().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  result: z.enum(["SUCCESS", "ERROR", "REJECT", "WARNING"]).optional(),
  severity: z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export const exportAuditLogsDto = z.object({
  filters: listAuditLogsQueryDto.default({}),
  format: z.enum(["CSV", "JSON"]),
});
