import { z } from "zod";

export const createTelegramUserSchema = z.object({
  username: z
    .string({ required_error: "Username Telegram wajib diisi" })
    .trim()
    .min(1, "Username Telegram wajib diisi")
    .max(100, "Username Telegram maksimal 100 karakter"),
  fullName: z
    .string({ required_error: "Nama lengkap wajib diisi" })
    .trim()
    .min(1, "Nama lengkap wajib diisi")
    .max(100, "Nama lengkap maksimal 100 karakter"),
  telegramId: z.string().trim().max(50, "Telegram ID maksimal 50 karakter").nullable().optional(),
  division: z
    .enum(["none", "after_sales", "rnd", "RnD", "RND", "software", "NONE", "AFTER_SALES", "SOFTWARE"], {
      errorMap: () => ({ message: "Divisi harus berupa none, after_sales, atau rnd" }),
    })
    .optional()
    .nullable()
    .transform((val) => {
      if (!val) return null;
      const lower = val.toLowerCase();
      return lower === "software" ? "rnd" : lower;
    }),
  isActive: z.boolean().optional().default(true),
});

export const updateTelegramUserSchema = z
  .object({
    username: z.string().trim().min(1, "Username tidak boleh kosong").max(100).optional(),
    fullName: z.string().trim().min(1, "Nama lengkap tidak boleh kosong").max(100).optional(),
    telegramId: z.string().trim().max(50).nullable().optional(),
    division: z
      .enum(["none", "after_sales", "rnd", "RnD", "RND", "software", "NONE", "AFTER_SALES", "SOFTWARE"], {
        errorMap: () => ({ message: "Divisi harus berupa none, after_sales, atau rnd" }),
      })
      .optional()
      .nullable()
      .transform((val) => {
        if (!val) return null;
        const lower = val.toLowerCase();
        return lower === "software" ? "rnd" : lower;
      }),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu kolom harus disertakan untuk pembaruan",
  });

export const queryTelegramUserSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().trim().optional(),
  division: z.string().trim().optional(),
  isActive: z.enum(["true", "false", "all"]).optional(),
});
