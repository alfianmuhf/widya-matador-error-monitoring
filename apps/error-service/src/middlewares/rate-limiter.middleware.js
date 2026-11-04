import { rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";
import { getRateLimitStore } from "../config/rate-limit-redis.js";

/**
 * 1. Global API Rate Limiter
 * Berlaku umum untuk seluruh endpoint API (default: 300 request / 15 menit).
 * Mengecualikan /health, /, dan Server-Sent Events (SSE) /tickets/events.
 */
export const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_GLOBAL_WINDOW_MS,
  limit: env.RATE_LIMIT_GLOBAL_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  passOnStoreError: true,
  store: getRateLimitStore("rl:global:"),
  skip: (req) => {
    if (!env.RATE_LIMIT_ENABLED || env.NODE_ENV === "test") return true;
    const path = req.path || req.url;
    // Bypass healthcheck, root ping, dan SSE stream
    return path === "/health" || path === "/" || path.includes("/events");
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      error: "Too Many Requests",
      message: "Terlalu banyak permintaan dari IP ini. Silakan coba lagi nanti.",
    });
  },
});

/**
 * 2. Strict Auth Rate Limiter
 * Khusus untuk endpoint autentikasi (/auth/login & /auth/refresh).
 * Mencegah serangan brute-force dan credential stuffing (default: 10 request / 15 menit).
 */
export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_AUTH_WINDOW_MS,
  limit: env.RATE_LIMIT_AUTH_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  passOnStoreError: true,
  store: getRateLimitStore("rl:auth:"),
  skip: () => !env.RATE_LIMIT_ENABLED || env.NODE_ENV === "test",
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      error: "Too Many Requests",
      message: "Terlalu banyak percobaan autentikasi. Demi keamanan, silakan coba lagi dalam beberapa menit.",
    });
  },
});

/**
 * 3. Media Upload Rate Limiter
 * Khusus untuk endpoint upload lampiran foto & video tiket.
 * Melindungi CPU dari beban berlebih FFmpeg transcoding dan storage disk (default: 20 upload / 15 menit).
 */
export const uploadLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_UPLOAD_WINDOW_MS,
  limit: env.RATE_LIMIT_UPLOAD_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  passOnStoreError: true,
  store: getRateLimitStore("rl:upload:"),
  skip: () => !env.RATE_LIMIT_ENABLED || env.NODE_ENV === "test",
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      statusCode: 429,
      error: "Too Many Requests",
      message: "Batas frekuensi unggah berkas tercapai. Silakan coba lagi beberapa saat lagi.",
    });
  },
});

