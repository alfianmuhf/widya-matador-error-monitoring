import Redis from "ioredis";
import { env } from "./env.js";

let redisClient = null;
let isRedisAvailable = false;

try {
  redisClient = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        return null; // Stop retrying if failed multiple times
      }
      return Math.min(times * 200, 2000);
    },
  });

  redisClient.on("connect", () => {
    isRedisAvailable = true;
    console.log(`[Redis] Connected successfully to ${env.REDIS_HOST}:${env.REDIS_PORT}`);
  });

  redisClient.on("error", (err) => {
    isRedisAvailable = false;
    console.warn(`[Redis] Warning/Error: ${err.message}`);
  });

  redisClient.on("close", () => {
    isRedisAvailable = false;
  });

  // Attempt initial connect asynchronously
  redisClient.connect().catch((err) => {
    isRedisAvailable = false;
    console.warn(`[Redis] Initial connection failed: ${err.message}. Running without Redis cache.`);
  });
} catch (error) {
  console.warn(`[Redis] Failed to initialize Redis client: ${error.message}`);
}

/**
 * Get cached JSON data by key
 */
export async function getCache(key) {
  if (!redisClient || !isRedisAvailable) return null;
  try {
    const raw = await redisClient.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Redis] getCache error for key "${key}":`, err.message);
    return null;
  }
}

/**
 * Set cache with TTL in seconds (default: 60s)
 */
export async function setCache(key, data, ttlSeconds = 60) {
  if (!redisClient || !isRedisAvailable) return false;
  try {
    const serialized = JSON.stringify(data);
    await redisClient.set(key, serialized, "EX", ttlSeconds);
    return true;
  } catch (err) {
    console.warn(`[Redis] setCache error for key "${key}":`, err.message);
    return false;
  }
}

/**
 * Delete a specific key from cache
 */
export async function delCache(key) {
  if (!redisClient || !isRedisAvailable) return false;
  try {
    await redisClient.del(key);
    return true;
  } catch (err) {
    console.warn(`[Redis] delCache error for key "${key}":`, err.message);
    return false;
  }
}

/**
 * Delete keys matching a pattern using SCAN (non-blocking)
 */
export async function delCacheByPattern(pattern) {
  if (!redisClient || !isRedisAvailable) return false;
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } while (cursor !== "0");
    return true;
  } catch (err) {
    console.warn(`[Redis] delCacheByPattern error for pattern "${pattern}":`, err.message);
    return false;
  }
}

/**
 * Invalidate all dashboard-related caches (summary, analytics, ticket-management)
 */
export async function invalidateDashboardCaches() {
  if (!redisClient || !isRedisAvailable) return false;
  try {
    await Promise.all([
      delCacheByPattern("summary:*"),
      delCacheByPattern("analytics:*"),
      delCacheByPattern("ticket-management:*"),
    ]);
    return true;
  } catch (err) {
    console.warn("[Redis] invalidateDashboardCaches error:", err.message);
    return false;
  }
}

export default redisClient;
