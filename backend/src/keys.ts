import { createHash } from "node:crypto";

import { env } from "./env.js";
import type { RewriteRequest } from "./validation.js";

export function cacheHash(payload: RewriteRequest, memory: string | null) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        action: payload.action ?? null,
        instruction: payload.instruction ?? null,
        memory,
        model: env.OPENAI_MODEL,
        text: payload.text
      })
    )
    .digest("hex");
}

export function redisKey(...parts: string[]) {
  return `${env.REDIS_KEY_PREFIX}${parts.join(":")}`;
}

export function todayKeyDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function secondsUntilTomorrow(now = new Date()) {
  const tomorrow = new Date(now);
  tomorrow.setUTCHours(24, 0, 0, 0);
  return Math.max(60, Math.ceil((tomorrow.getTime() - now.getTime()) / 1000) + 3600);
}
