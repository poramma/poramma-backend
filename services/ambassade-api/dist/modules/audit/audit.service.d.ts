import { db } from "../../db/connection";
import { auditLogs } from "../../db/schema.audit";
interface Actor {
    userId: string;
    roleName: string | null;
}
export declare function writeAudit(params: {
    action: string;
    entityType: string;
    entityId: string;
    actor: Actor | null;
    result?: "SUCCESS" | "ERROR" | "REJECT" | "WARNING";
    severity?: "INFO" | "WARNING" | "CRITICAL";
    entitySnapshot?: Record<string, unknown> | null;
    details?: Record<string, unknown> | null;
    ip?: string | null;
    ua?: string | null;
    sessionId?: string | null;
    tx?: Pick<typeof db, "insert">;
}): Promise<void>;
export interface AuditFilters {
    actorUserId?: string;
    actorRole?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    result?: string;
    severity?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
}
export declare function enrichLogs(rows: (typeof auditLogs.$inferSelect)[]): Promise<{
    id: string;
    at: Date;
    actorUserId: string | null;
    actorEmail: string | null;
    actorInue: string | null;
    actorName: string | null;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    entitySnapshot: unknown;
    result: string;
    details: unknown;
    ip: string | null;
    ua: string | null;
    sessionId: string | null;
    severity: string;
}[]>;
export declare function enrichLog(row: typeof auditLogs.$inferSelect): Promise<{
    id: string;
    at: Date;
    actorUserId: string | null;
    actorEmail: string | null;
    actorInue: string | null;
    actorName: string | null;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    entitySnapshot: unknown;
    result: string;
    details: unknown;
    ip: string | null;
    ua: string | null;
    sessionId: string | null;
    severity: string;
}>;
export declare function listLogs(filters: AuditFilters): Promise<{
    data: {
        id: string;
        at: Date;
        actorUserId: string | null;
        actorEmail: string | null;
        actorInue: string | null;
        actorName: string | null;
        actorRole: string;
        action: string;
        entityType: string;
        entityId: string;
        entitySnapshot: unknown;
        result: string;
        details: unknown;
        ip: string | null;
        ua: string | null;
        sessionId: string | null;
        severity: string;
    }[];
    meta: import("@poramma/dto").PaginationMeta;
}>;
export declare function getLog(id: string): Promise<{
    id: string;
    at: Date;
    actorUserId: string | null;
    actorEmail: string | null;
    actorInue: string | null;
    actorName: string | null;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    entitySnapshot: unknown;
    result: string;
    details: unknown;
    ip: string | null;
    ua: string | null;
    sessionId: string | null;
    severity: string;
} | null>;
export declare function getStats(): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byResult: Record<string, number>;
    failedLogins: number;
    criticalEvents: number;
}>;
export declare function exportLogsAsCsv(filters: AuditFilters): Promise<string>;
export declare function listMyActivity(userId: string, opts: {
    page?: number;
    limit?: number;
}): Promise<{
    data: {
        id: string;
        at: Date;
        action: string;
        entityType: string;
        entityId: string;
        targetLabel: string | null;
        result: string;
        severity: string;
    }[];
    meta: import("@poramma/dto").PaginationMeta;
}>;
export {};
//# sourceMappingURL=audit.service.d.ts.map