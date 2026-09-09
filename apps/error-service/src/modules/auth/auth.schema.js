import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email wajib diisi" })
    .trim()
    .toLowerCase()
    .email("Format email tidak valid"),
  password: z
    .string({ required_error: "Password wajib diisi" })
    .min(6, "Password minimal 6 karakter"),
});

export const registerSchema = z.object({
  email: z
    .string({ required_error: "Email wajib diisi" })
    .trim()
    .toLowerCase()
    .email("Format email tidak valid"),
  password: z
    .string({ required_error: "Password wajib diisi" })
    .min(6, "Password minimal 6 karakter"),
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .optional(),
  role: z
    .enum(["USER", "ADMIN"], {
      errorMap: () => ({ message: "Role harus berupa USER atau ADMIN" }),
    })
    .optional()
    .default("USER"),
});
