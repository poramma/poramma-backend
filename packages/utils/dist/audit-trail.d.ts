import type { NextFunction, Request, Response } from "express";
export declare function markAudited(): void;
export interface AuditTrailEntry {
    action: string;
    entityType: string;
    entityId: string;
    actor: {
        userId: string;
        roleName: string | null;
    };
    result: "SUCCESS" | "ERROR" | "REJECT";
    severity: "INFO" | "WARNING" | "CRITICAL";
    details: Record<string, unknown>;
    ip: string | null;
    ua: string | null;
    sessionId: string | null;
}
export declare function deriveAuditTarget(method: string, routePath: string): {
    entityType: string;
    action: string;
    idParam?: string;
};
export declare function auditTrail(options: {
    write: (entry: AuditTrailEntry) => Promise<void>;
}): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=audit-trail.d.ts.map