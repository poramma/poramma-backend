import type { Db } from "../db-type";
interface Actor {
    userId: string;
    roleName: string | null;
}
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
    tx?: Pick<Db, "insert">;
}): Promise<void>;
export {};
//# sourceMappingURL=audit.d.ts.map