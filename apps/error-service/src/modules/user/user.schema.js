import { z } from "zod";

/**
 * Validation schema for Admin creating a new user
 */
export const createUserSchema = z.object({
  username: z
    .string({ required_error: "Username wajib diisi" })
    .trim()
    .min(3, "Username minimal 3 karakter")
    .max(50, "Username maksimal 50 karakter"),
  email: z.string().trim().optional(),
  name: z
    .string({ required_error: "Nama wajib diisi" })
    .trim()
    .min(2, "Nama minimal 2 karakter"),
  role: z
    .enum(["ADMIN", "COORDINATOR", "VIEWER", "admin", "coordinator", "viewer"], {
      errorMap: () => ({ message: "Role harus berupa ADMIN, COORDINATOR, atau VIEWER" }),
    })
    .optional()
    .default("viewer")
    .transform((val) => val.toLowerCase()),
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
  // ID Akun Telegram dari tabel telegram_users (Whitelist)
  telegramUserId: z
    .string()
    .uuid("Format ID Telegram tidak valid")
    .optional()
    .nullable(),
  telegram_user_id: z
    .string()
    .uuid("Format ID Telegram tidak valid")
    .optional()
    .nullable(),
  // Opsional: tujuan DM notifikasi invite via Telegram (fallback/kompatibilitas)
  telegramId: z
    .string()
    .trim()
    .min(1, "Telegram ID tidak boleh kosong")
    .max(50, "Telegram ID maksimal 50 karakter")
    .optional()
    .nullable(),
  telegramUsername: z
    .string()
    .trim()
    .max(100, "Username Telegram maksimal 100 karakter")
    .optional()
    .nullable(),
});

/**
 * Validation schema for Admin updating an existing user
 */
export const updateUserSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, "Username minimal 3 karakter")
      .max(50, "Username maksimal 50 karakter")
      .optional(),
    email: z.string().trim().optional(),
    name: z
      .string()
      .trim()
      .min(2, "Nama minimal 2 karakter")
      .optional(),
    password: z
      .string()
      .min(6, "Password minimal 6 karakter")
      .optional(),
    role: z
      .enum(["ADMIN", "COORDINATOR", "VIEWER", "admin", "coordinator", "viewer"], {
        errorMap: () => ({ message: "Role harus berupa ADMIN, COORDINATOR, atau VIEWER" }),
      })
      .optional()
      .transform((val) => (val ? val.toLowerCase() : undefined)),
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
    status: z
      .enum(["ACTIVE", "SUSPENDED", "INVITED", "active", "suspended", "invited"], {
        errorMap: () => ({ message: "Status harus berupa ACTIVE atau SUSPENDED" }),
      })
      .optional()
      .transform((val) => (val ? val.toLowerCase() : undefined)),
    telegramUserId: z
      .string()
      .uuid("Format ID Telegram tidak valid")
      .optional()
      .nullable(),
    telegram_user_id: z
      .string()
      .uuid("Format ID Telegram tidak valid")
      .optional()
      .nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu field harus disertakan untuk pembaruan data",
  });
