import { createHash, timingSafeEqual } from "node:crypto";
import createError from "http-errors";
import { env } from "../../config/env.js";

const sha256 = (value) => createHash("sha256").update(value).digest();

/**
 * Guard API key jalur ingest n8n.
 * Dipasang SEBELUM parser multipart: 401/503 tidak pernah menyentuh tubuh besar.
 */
export const requireApiKey = (req, res, next) => {
  const active = env.TELEGRAM_API_KEY;
  if (!active) {
    return next(createError(503, "Endpoint ingest Telegram belum dikonfigurasi"));
  }

  const provided = req.get("X-API-Key") || "";
  const digest = sha256(provided);

  const matchesActive = timingSafeEqual(digest, sha256(active));
  const matchesPrevious =
    env.TELEGRAM_API_KEY_PREVIOUS &&
    timingSafeEqual(digest, sha256(env.TELEGRAM_API_KEY_PREVIOUS)); // slot rotasi

  if (!matchesActive && !matchesPrevious) {
    // Key tidak pernah dicatat penuh — hanya 4 karakter terakhir
    console.warn(`[telegram-ingest] API key ditolak (akhir key: ...${provided.slice(-4)})`);
    return next(createError(401, "API key tidak valid"));
  }

  next();
};
