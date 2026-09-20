import Redis from "ioredis";
export declare function getRedisClient(): Redis;
export declare function markSessionActive(sessionId: string, ttlSeconds: number): Promise<void>;
export declare function isSessionActive(sessionId: string): Promise<boolean>;
export declare function revokeSession(sessionId: string): Promise<void>;
export declare function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{
    allowed: boolean;
    remaining: number;
}>;
//# sourceMappingURL=index.d.ts.map