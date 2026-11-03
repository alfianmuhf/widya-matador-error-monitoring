import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import path from "node:path";
import createError from "http-errors";
import * as telegramIngestController from "./controller.js";
import { requireApiKey } from "./api-key.middleware.js";
import { env } from "../../config/env.js";
import { VIDEO_STAGING_DIR } from "../attachment/attachment.video.js";

// Instance multer pribadi jalur ingest — BUKAN batas 350 MB jalur frontend.
// Foto butuh minimal 5 MB; video dibatasi TELEGRAM_MAX_VIDEO_MB (default 20).
const INGEST_SIZE_LIMIT = Math.max(5, env.TELEGRAM_MAX_VIDEO_MB) * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEO_STAGING_DIR),
  // UUID v4 murni (.raw): nama asli pengirim tidak pernah menyentuh disk
  filename: (req, file, cb) => cb(null, `${randomUUID()}.raw`),
});

const upload = multer({
  storage,
  limits: { fileSize: INGEST_SIZE_LIMIT, files: 1 },
});

const handleUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE") {
      return next(createError(413, `Ukuran file melebihi batas jalur Telegram (${INGEST_SIZE_LIMIT} bytes)`));
    }
    return next(createError(400, "Gagal membaca file yang diunggah"));
  });
};

const router = Router();

router.post("/attachments", requireApiKey, handleUpload, telegramIngestController.uploadAttachment);

export default router;
