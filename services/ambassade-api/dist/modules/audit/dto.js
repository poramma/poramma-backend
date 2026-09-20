"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAuditLogsDto = exports.listAuditLogsQueryDto = void 0;
const zod_1 = require("zod");
exports.listAuditLogsQueryDto = zod_1.z.object({
    actorUserId: zod_1.z.string().uuid().optional(),
    actorRole: zod_1.z.string().optional(),
    action: zod_1.z.string().optional(),
    entityType: zod_1.z.string().optional(),
    entityId: zod_1.z.string().optional(),
    result: zod_1.z.enum(["SUCCESS", "ERROR", "REJECT", "WARNING"]).optional(),
    severity: zod_1.z.enum(["INFO", "WARNING", "CRITICAL"]).optional(),
    dateFrom: zod_1.z.string().optional(),
    dateTo: zod_1.z.string().optional(),
    search: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().positive().optional(),
    limit: zod_1.z.coerce.number().int().positive().max(200).optional(),
});
exports.exportAuditLogsDto = zod_1.z.object({
    filters: exports.listAuditLogsQueryDto.default({}),
    format: zod_1.z.enum(["CSV", "JSON"]),
});
//# sourceMappingURL=dto.js.map