import { z } from "zod";

export const createTelegramUserSchema = z.object({
  telegramId: z
    .string({ required_error: "Telegram ID wajib diisi" })
    .trim()
    .min(1, "Telegram ID wajib diisi")
    .max(50, "Telegram ID maksimal 50 karakter"),
  username: z.string().trim().max(100).nullable().optional(),
  fullName: z.string().trim().max(100).nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateTelegramUserSchema = z
  .object({
    username: z.string().trim().max(100).nullable().optional(),
    fullName: z.string().trim().max(100).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu kolom harus disertakan untuk pembaruan",
  });

export const queryTelegramUserSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().trim().optional(),
  isActive: z.enum(["true", "false", "all"]).optional(),
});
