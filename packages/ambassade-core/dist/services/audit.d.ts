import type { Db } from "../db-type";
import { auditLogs } from "../schema/audit";
interface Actor {
    userId: string;
    roleName: string | null;
}
export type AuditDomain = "EMBASSY" | "COMMUNITY";
export declare function resolveDomain(db: Db, userId: string | null | undefined, fallback?: AuditDomain): Promise<AuditDomain>;
export declare function writeAudit(db: Db, params: {
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
    domain?: AuditDomain;
    tx?: Pick<Db, "insert">;
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
export declare function enrichLogs(db: Db, rows: (typeof auditLogs.$inferSelect)[]): Promise<{
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
export declare function listLogs(db: Db, domain: AuditDomain, filters: AuditFilters): Promise<{
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
    total: number;
    page: number;
    limit: number;
}>;
export declare function getLog(db: Db, domain: AuditDomain, id: string): Promise<{
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
export declare function getStats(db: Db, domain: AuditDomain): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byResult: Record<string, number>;
    failedLogins: number;
    criticalEvents: number;
}>;
export declare function exportLogsAsCsv(db: Db, domain: AuditDomain, filters: AuditFilters): Promise<string>;
export {};
//# sourceMappingURL=audit.d.ts.map