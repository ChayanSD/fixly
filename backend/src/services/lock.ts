import { randomUUID } from "node:crypto";

import { redisKey } from "../keys.js";
import { redis } from "../redis.js";

const lockReleaseScript = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

export async function acquireRewriteLock(hash: string) {
  try {
    const token = randomUUID();
    const key = redisKey("lock", hash);
    const result = await redis.set(key, token, "PX", 30_000, "NX");

    if (result !== "OK") {
      return null;
    }

    return { key, token };
  } catch (error) {
    console.error("Redis lock acquire failed", error);
    return null;
  }
}

export async function releaseRewriteLock(lock: { key: string; token: string } | null) {
  if (!lock) {
    return;
  }

  try {
    await redis.eval(lockReleaseScript, 1, lock.key, lock.token);
  } catch (error) {
    console.error("Redis lock release failed", error);
  }
}
