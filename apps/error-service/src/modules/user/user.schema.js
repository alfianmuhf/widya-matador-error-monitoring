import { z } from "zod";

/**
 * Validation schema for Admin creating a new user
 */
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
    .enum(["ADMIN", "COORDINATOR", "VIEWER", "admin", "coordinator", "viewer"], {
      errorMap: () => ({ message: "Role harus berupa ADMIN, COORDINATOR, atau VIEWER" }),
    })
    .optional()
    .default("viewer")
    .transform((val) => val.toLowerCase()),
  division: z
    .enum(["none", "after_sales", "software", "NONE", "AFTER_SALES", "SOFTWARE"], {
      errorMap: () => ({ message: "Divisi harus berupa none, after_sales, atau software" }),
    })
    .optional()
    .nullable()
    .transform((val) => (val ? val.toLowerCase() : null)),
  // Opsional: tujuan DM notifikasi invite via Telegram (tanpa migrasi — tidak disimpan di DB)
  telegramId: z
    .string()
    .trim()
    .min(1, "Telegram ID tidak boleh kosong")
    .max(50, "Telegram ID maksimal 50 karakter")
    .optional()
    .nullable(),
  username: z
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
      .enum(["none", "after_sales", "software", "NONE", "AFTER_SALES", "SOFTWARE"], {
        errorMap: () => ({ message: "Divisi harus berupa none, after_sales, atau software" }),
      })
      .optional()
      .nullable()
      .transform((val) => (val ? val.toLowerCase() : null)),
    status: z
      .enum(["ACTIVE", "SUSPENDED", "INVITED", "active", "suspended", "invited"], {
        errorMap: () => ({ message: "Status harus berupa ACTIVE atau SUSPENDED" }),
      })
      .optional()
      .transform((val) => (val ? val.toLowerCase() : undefined)),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu field harus disertakan untuk pembaruan data",
  });
