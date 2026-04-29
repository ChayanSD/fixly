import { Redis } from "ioredis";

import { env } from "./env.js";

export const redis = new Redis(env.REDIS_URL, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy(times: number) {
    return Math.min(times * 50, 1000);
  }
});

redis.on("error", (error: Error) => {
  console.error("Redis error", error);
});
