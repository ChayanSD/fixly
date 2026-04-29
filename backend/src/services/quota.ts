import { ApiError } from "../api.js";
import { env } from "../env.js";
import { redisKey, secondsUntilTomorrow, todayKeyDate } from "../keys.js";
import { redis } from "../redis.js";

interface QuotaResult {
  limit: number;
  remaining: number;
  resetAt: number;
}

const quotaScript = `
local current = redis.call("incr", KEYS[1])
if current == 1 then
  redis.call("expire", KEYS[1], ARGV[2])
end
if current > tonumber(ARGV[1]) then
  return {current, redis.call("ttl", KEYS[1])}
end
return {current, redis.call("ttl", KEYS[1])}
`;

export async function consumeDailyQuota(installId: string): Promise<QuotaResult> {
  const now = new Date();
  const ttlSeconds = secondsUntilTomorrow(now);
  const key = redisKey("quota", installId, todayKeyDate(now));

  try {
    const result = (await redis.eval(quotaScript, 1, key, env.DAILY_REWRITE_LIMIT, ttlSeconds)) as [number, number];
    const used = Number(result[0]);
    const ttl = Number(result[1]);
    const resetAt = Math.floor(Date.now() / 1000) + Math.max(ttl, 0);

    if (used > env.DAILY_REWRITE_LIMIT) {
      throw new ApiError(429, "daily_limit_exceeded", "Daily rewrite limit reached.", {
        limit: env.DAILY_REWRITE_LIMIT,
        resetAt
      });
    }

    return {
      limit: env.DAILY_REWRITE_LIMIT,
      remaining: Math.max(env.DAILY_REWRITE_LIMIT - used, 0),
      resetAt
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    console.error("Redis quota failed", error);
    throw new ApiError(503, "service_unavailable", "Usage quota is temporarily unavailable.");
  }
}
