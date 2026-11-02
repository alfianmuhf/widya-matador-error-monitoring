import { z } from "zod";
import createError from "http-errors";

/**
/**
 * Field multipart dari workflow n8n (semua string).
 * Identitas pengunggah: minimal satu (telegram_user_id ATAU telegram_username).
 */
export const ingestBodySchema = z
  .object({
    ticket_id: z.string().trim().min(1).max(50),
    telegram_user_id: z
      .string()
      .regex(/^\d+$/, "telegram_user_id harus angka Telegram")
      .max(20)
      .optional(),
    telegram_username: z.string().trim().min(1).max(100).optional(),
    chat_id: z.string().trim().min(1).max(50).optional(),
  })
  .refine((b) => Boolean(b.telegram_user_id || b.telegram_username), {
    message: "telegram_user_id atau telegram_username wajib diisi",
  });

export const parseIngestBody = (body = {}) =>
  ingestBodySchema.parse({
    ticket_id: body.ticket_id ?? "",
    telegram_user_id: body.telegram_user_id || undefined,
    telegram_username: body.telegram_username || undefined,
    chat_id: body.chat_id || undefined,
  });

/** Header Idempotency-Key dari n8n (umumnya Telegram message_id); kolom DB VarChar(64) */
export const parseIdempotencyKey = (raw) => {
  const key = (raw || "").trim();
  if (!key) return null;
  if (key.length > 64) {
    throw createError(400, "Idempotency-Key maksimal 64 karakter");
  }
  return key;
};
