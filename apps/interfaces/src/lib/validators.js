import { z } from "zod";

// sync with apps/error-service/src/modules/auth/auth.schema.js
export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email wajib diisi" })
    .trim()
    .toLowerCase()
    .email("Format email tidak valid")
    .max(100),
  password: z
    .string({ required_error: "Password wajib diisi" })
    .min(6, "Password minimal 6 karakter")
    .max(72),
});

// sync with apps/error-service/src/modules/user/user.schema.js
export const createUserSchema = z.object({
  email: z
    .string({ required_error: "Email wajib diisi" })
    .trim()
    .toLowerCase()
    .email("Format email tidak valid"),
  name: z
    .string({ required_error: "Nama wajib diisi" })
    .trim()
    .min(2, "Nama minimal 2 karakter"),
  role: z
    .enum(["ADMIN", "COORDINATOR", "VIEWER"])
    .default("ADMIN"),
});

export const updateUserSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Format email tidak valid")
    .optional(),
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .optional(),
  role: z
    .enum(["ADMIN", "COORDINATOR", "VIEWER"])
    .optional(),
  status: z
    .enum(["INVITED", "ACTIVE", "SUSPENDED"])
    .optional(),
});

// sync with apps/error-service/src/modules/telegram/telegram.schema.js
export const createTelegramUserSchema = z.object({
  telegramId: z
    .string({ required_error: "Telegram ID wajib diisi" })
    .trim()
    .min(1, "Telegram ID wajib diisi")
    .refine((val) => /^-?\d+$/.test(val), {
      message: "Telegram ID harus berupa angka numerik",
    }),
  username: z
    .string()
    .trim()
    .optional(),
  fullName: z
    .string()
    .trim()
    .optional(),
  isActive: z.boolean().default(true),
});

export const updateTelegramUserSchema = z.object({
  fullName: z.string().trim().optional(),
  username: z.string().trim().optional(),
  isActive: z.boolean().optional(),
});

// sync with apps/error-service/src/modules/auth/auth.schema.js
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "Password saat ini wajib diisi" })
      .min(1, "Password saat ini wajib diisi"),
    newPassword: z
      .string({ required_error: "Password baru wajib diisi" })
      .min(6, "Password baru minimal 6 karakter"),
    confirmPassword: z.string({ required_error: "Konfirmasi password wajib diisi" }).min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Konfirmasi password baru tidak cocok",
    path: ["confirmPassword"],
  });

