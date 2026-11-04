import { RedisStore } from "rate-limit-redis";
import redisClient from "./redis.js";
import { env } from "./env.js";

/**
 * Membuat RedisStore untuk express-rate-limit.
 * Jika Redis tidak aktif atau sedang dalam pengujian (test), mengembalikan undefined
 * sehingga express-rate-limit otomatis fallback ke in-memory MemoryStore.
 */
export function getRateLimitStore(prefix = "rl:") {
  if (env.NODE_ENV === "test" || !redisClient) {
    return undefined;
  }

  try {
    return new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
      prefix,
    });
  } catch (error) {
    console.warn(`[RateLimit] Gagal inisialisasi RedisStore (${prefix}), beralih ke MemoryStore:`, error.message);
    return undefined;
  }
}

export default getRateLimitStore;

