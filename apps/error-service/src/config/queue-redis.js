import Redis from "ioredis";
import { env } from "./env.js";

/**
 * Dedicated Redis connection options for BullMQ.
 * BullMQ requires maxRetriesPerRequest: null and enableReadyCheck: false.
 */
export const queueRedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const createQueueRedisConnection = () => {
  return new Redis(queueRedisOptions);
};

