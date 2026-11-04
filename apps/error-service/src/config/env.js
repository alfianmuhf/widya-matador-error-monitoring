import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("30m"),
  JWT_REFRESH_SECRET: z.string().min(1, "JWT_REFRESH_SECRET is required"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("1d"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  CORS_ORIGINS: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.string().optional(),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  VIDEO_CRF: z.coerce.number().min(0).max(51).default(28),
  VIDEO_MAX_RESOLUTION: z.string().default("1080p"),
  VIDEO_MAX_SIZE_MB: z.coerce.number().int().min(1).max(500).default(350),
  VIDEO_MAX_DURATION_SECONDS: z.coerce.number().int().min(5).max(600).default(120),
  // Jalur ingest unggahan dari workflow n8n (Telegram). Opsional: tanpa key, endpoint balik 503.
  TELEGRAM_API_KEY: z
    .preprocess((val) => (val === "" ? undefined : val), z.string().min(32).optional()),
  TELEGRAM_API_KEY_PREVIOUS: z
    .preprocess((val) => (val === "" ? undefined : val), z.string().min(32).optional()), // slot rotasi tanpa downtime
  TELEGRAM_MAX_VIDEO_MB: z.coerce.number().int().min(1).max(350).default(20),
  // Logging (Pino)
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  // Rate Limiting (express-rate-limit)
  RATE_LIMIT_ENABLED: z
    .preprocess((val) => (val === "false" || val === false ? false : true), z.boolean())
    .default(true),
  RATE_LIMIT_GLOBAL_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().default(300),
  RATE_LIMIT_AUTH_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(10),
  RATE_LIMIT_UPLOAD_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000),
  RATE_LIMIT_UPLOAD_MAX: z.coerce.number().default(20),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues || [];
    console.error("❌ Invalid environment variables configuration:");
    issues.forEach((issue) => {
      console.error(` - [${issue.path.join(".")}]: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();
