import Redis from "ioredis";

/**
 * Shared Redis client (lazy singleton, mirrors @poramma/mailer's
 * initMailer()/sendMail() pattern) — used by identity-api AND ambassade-api
 * for two things that don't belong in Postgres:
 *   1. Real-time session revocation (JWT-03): requireAuth in both services
 *      checks `isSessionActive()` on every request, not just at refresh
 *      time, so a suspended/logged-out session stops working immediately
 *      instead of only after the access token's own 15min expiry.
 *   2. Rate limiting on /auth/login and OTP endpoints.
 * Both services verify JWTs independently (permissions denormalized into
 * the token, see identity-api/ambassade-api shared/middleware.ts) but they
 * share the same physical Redis instance, so a revocation written by
 * identity-api is immediately visible to ambassade-api's own check.
 */

let client: Redis | undefined;

export function getRedisClient(): Redis {
  if (!client) {
    const url = process.env.REDIS_URL || "redis://redis:6379";
    client = new Redis(url);
    client.on("error", (err) => console.error("[@poramma/cache] Redis error:", err.message));
  }
  return client;
}

const SESSION_PREFIX = "poramma:session:";

/** Called at login and at every refresh — the TTL is the session's remaining lifetime. */
export async function markSessionActive(sessionId: string, ttlSeconds: number): Promise<void> {
  await getRedisClient().set(`${SESSION_PREFIX}${sessionId}`, "1", "EX", ttlSeconds);
}

/** Checked by requireAuth on every authenticated request. */
export async function isSessionActive(sessionId: string): Promise<boolean> {
  const value = await getRedisClient().get(`${SESSION_PREFIX}${sessionId}`);
  return value !== null;
}

/** Called on logout and on suspend (agents.service.ts revokes every active session for a user). */
export async function revokeSession(sessionId: string): Promise<void> {
  await getRedisClient().del(`${SESSION_PREFIX}${sessionId}`);
}

const RATE_LIMIT_PREFIX = "poramma:ratelimit:";

/**
 * Fixed-window counter — simple and sufficient for login/OTP throttling
 * (no need for a sliding window here). `key` should already identify the
 * caller (e.g. `login:${ip}` or `otp:${email}`).
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
  const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
  const count = await getRedisClient().incr(redisKey);
  if (count === 1) {
    await getRedisClient().expire(redisKey, windowSeconds);
  }
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}
