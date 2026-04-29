import { env } from "../env.js";
import { redisKey } from "../keys.js";
import { redis } from "../redis.js";

interface CachedRewrite {
  createdAt: string;
  model: string;
  result: string;
}

export async function getCachedRewrite(hash: string) {
  try {
    const value = await redis.get(redisKey("cache", hash));
    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value) as Partial<CachedRewrite>;
    if (typeof parsed.result !== "string" || parsed.result.length === 0) {
      return null;
    }

    return parsed.result;
  } catch (error) {
    console.error("Redis cache read failed", error);
    return null;
  }
}

export async function setCachedRewrite(hash: string, result: string) {
  try {
    const payload = JSON.stringify({
      createdAt: new Date().toISOString(),
      model: env.OPENAI_MODEL,
      result
    } satisfies CachedRewrite);

    await redis.set(redisKey("cache", hash), payload, "EX", env.REWRITE_CACHE_TTL_SECONDS);
  } catch (error) {
    console.error("Redis cache write failed", error);
  }
}
