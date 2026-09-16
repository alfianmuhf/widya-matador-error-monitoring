import { z } from "zod";

/**
 * Validation schema for Admin adding a new user to Telegram whitelist
 */
export const createTelegramUserSchema = z.object({
  telegramId: z
    .union([
      z.string({ required_error: "Telegram ID wajib diisi" }).min(1, "Telegram ID wajib diisi"),
      z.number({ required_error: "Telegram ID wajib diisi" }),
    ])
    .transform((val) => String(val).trim())
    .refine((val) => /^-?\d+$/.test(val), {
      message: "Telegram ID harus berupa angka numerik",
    }),
  username: z
    .string()
    .trim()
    .transform((val) => (val ? val.replace(/^@/, "") : val))
    .optional(),
  fullName: z
    .string()
    .trim()
    .min(1, "Nama lengkap tidak boleh kosong")
    .optional(),
  isActive: z.boolean().optional().default(true),
});

/**
 * Validation schema for Admin updating a Telegram whitelist user (status, username, fullName)
 */
export const updateTelegramUserSchema = z
  .object({
    isActive: z.boolean({ invalid_type_error: "Status isActive harus berupa boolean (true/false)" }).optional(),
    username: z
      .string()
      .trim()
      .transform((val) => (val ? val.replace(/^@/, "") : val))
      .optional(),
    fullName: z.string().trim().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu field harus disertakan untuk pembaruan data",
  });
