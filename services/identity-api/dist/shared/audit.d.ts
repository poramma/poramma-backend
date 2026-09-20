interface Actor {
    userId: string | null;
    roleName: string | null;
}
export declare function writeAudit(params: {
    action: string;
    entityType: string;
    entityId: string;
    actor: Actor;
    result?: "SUCCESS" | "ERROR" | "REJECT" | "WARNING";
    severity?: "INFO" | "WARNING" | "CRITICAL";
    entitySnapshot?: Record<string, unknown> | null;
    details?: Record<string, unknown> | null;
    ip?: string | null;
    ua?: string | null;
    sessionId?: string | null;
}): Promise<void>;
export {};
//# sourceMappingURL=audit.d.ts.map