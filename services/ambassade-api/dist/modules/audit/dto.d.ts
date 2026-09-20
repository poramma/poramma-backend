import { z } from "zod";
export declare const listAuditLogsQueryDto: z.ZodObject<{
    actorUserId: z.ZodOptional<z.ZodString>;
    actorRole: z.ZodOptional<z.ZodString>;
    action: z.ZodOptional<z.ZodString>;
    entityType: z.ZodOptional<z.ZodString>;
    entityId: z.ZodOptional<z.ZodString>;
    result: z.ZodOptional<z.ZodEnum<["SUCCESS", "ERROR", "REJECT", "WARNING"]>>;
    severity: z.ZodOptional<z.ZodEnum<["INFO", "WARNING", "CRITICAL"]>>;
    dateFrom: z.ZodOptional<z.ZodString>;
    dateTo: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
    action?: string | undefined;
    actorUserId?: string | undefined;
    actorRole?: string | undefined;
    result?: "SUCCESS" | "ERROR" | "REJECT" | "WARNING" | undefined;
    limit?: number | undefined;
    entityType?: string | undefined;
    entityId?: string | undefined;
    severity?: "WARNING" | "INFO" | "CRITICAL" | undefined;
    page?: number | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
}, {
    search?: string | undefined;
    action?: string | undefined;
    actorUserId?: string | undefined;
    actorRole?: string | undefined;
    result?: "SUCCESS" | "ERROR" | "REJECT" | "WARNING" | undefined;
    limit?: number | undefined;
    entityType?: string | undefined;
    entityId?: string | undefined;
    severity?: "WARNING" | "INFO" | "CRITICAL" | undefined;
    page?: number | undefined;
    dateFrom?: string | undefined;
    dateTo?: string | undefined;
}>;
export declare const exportAuditLogsDto: z.ZodObject<{
    filters: z.ZodDefault<z.ZodObject<{
        actorUserId: z.ZodOptional<z.ZodString>;
        actorRole: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        entityType: z.ZodOptional<z.ZodString>;
        entityId: z.ZodOptional<z.ZodString>;
        result: z.ZodOptional<z.ZodEnum<["SUCCESS", "ERROR", "REJECT", "WARNING"]>>;
        severity: z.ZodOptional<z.ZodEnum<["INFO", "WARNING", "CRITICAL"]>>;
        dateFrom: z.ZodOptional<z.ZodString>;
        dateTo: z.ZodOptional<z.ZodString>;
        search: z.ZodOptional<z.ZodString>;
        page: z.ZodOptional<z.ZodNumber>;
        limit: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        search?: string | undefined;
        action?: string | undefined;
        actorUserId?: string | undefined;
        actorRole?: string | undefined;
        result?: "SUCCESS" | "ERROR" | "REJECT" | "WARNING" | undefined;
        limit?: number | undefined;
        entityType?: string | undefined;
        entityId?: string | undefined;
        severity?: "WARNING" | "INFO" | "CRITICAL" | undefined;
        page?: number | undefined;
        dateFrom?: string | undefined;
        dateTo?: string | undefined;
    }, {
        search?: string | undefined;
        action?: string | undefined;
        actorUserId?: string | undefined;
        actorRole?: string | undefined;
        result?: "SUCCESS" | "ERROR" | "REJECT" | "WARNING" | undefined;
        limit?: number | undefined;
        entityType?: string | undefined;
        entityId?: string | undefined;
        severity?: "WARNING" | "INFO" | "CRITICAL" | undefined;
        page?: number | undefined;
        dateFrom?: string | undefined;
        dateTo?: string | undefined;
    }>>;
    format: z.ZodEnum<["CSV", "JSON"]>;
}, "strip", z.ZodTypeAny, {
    format: "CSV" | "JSON";
    filters: {
        search?: string | undefined;
        action?: string | undefined;
        actorUserId?: string | undefined;
        actorRole?: string | undefined;
        result?: "SUCCESS" | "ERROR" | "REJECT" | "WARNING" | undefined;
        limit?: number | undefined;
        entityType?: string | undefined;
        entityId?: string | undefined;
        severity?: "WARNING" | "INFO" | "CRITICAL" | undefined;
        page?: number | undefined;
        dateFrom?: string | undefined;
        dateTo?: string | undefined;
    };
}, {
    format: "CSV" | "JSON";
    filters?: {
        search?: string | undefined;
        action?: string | undefined;
        actorUserId?: string | undefined;
        actorRole?: string | undefined;
        result?: "SUCCESS" | "ERROR" | "REJECT" | "WARNING" | undefined;
        limit?: number | undefined;
        entityType?: string | undefined;
        entityId?: string | undefined;
        severity?: "WARNING" | "INFO" | "CRITICAL" | undefined;
        page?: number | undefined;
        dateFrom?: string | undefined;
        dateTo?: string | undefined;
    } | undefined;
}>;
//# sourceMappingURL=dto.d.ts.map