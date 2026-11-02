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
  // Jalur ingest unggahan dari workflow n8n (Telegram). Opsional: tanpa key, endpoint balik 503.
  TELEGRAM_API_KEY: z.string().min(32).optional(),
  TELEGRAM_API_KEY_PREVIOUS: z.string().min(32).optional(), // slot rotasi tanpa downtime
  TELEGRAM_MAX_VIDEO_MB: z.coerce.number().int().min(1).max(350).default(20),
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
