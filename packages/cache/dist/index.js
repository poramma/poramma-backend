"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.markSessionActive = markSessionActive;
exports.isSessionActive = isSessionActive;
exports.revokeSession = revokeSession;
exports.checkRateLimit = checkRateLimit;
const ioredis_1 = __importDefault(require("ioredis"));
let client;
function getRedisClient() {
    if (!client) {
        const url = process.env.REDIS_URL || "redis://redis:6379";
        client = new ioredis_1.default(url);
        client.on("error", (err) => console.error("[@poramma/cache] Redis error:", err.message));
    }
    return client;
}
const SESSION_PREFIX = "poramma:session:";
async function markSessionActive(sessionId, ttlSeconds) {
    await getRedisClient().set(`${SESSION_PREFIX}${sessionId}`, "1", "EX", ttlSeconds);
}
async function isSessionActive(sessionId) {
    const value = await getRedisClient().get(`${SESSION_PREFIX}${sessionId}`);
    return value !== null;
}
async function revokeSession(sessionId) {
    await getRedisClient().del(`${SESSION_PREFIX}${sessionId}`);
}
const RATE_LIMIT_PREFIX = "poramma:ratelimit:";
async function checkRateLimit(key, limit, windowSeconds) {
    const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
    const count = await getRedisClient().incr(redisKey);
    if (count === 1) {
        await getRedisClient().expire(redisKey, windowSeconds);
    }
    return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
//# sourceMappingURL=index.js.map