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
    .string({ required_error: "Nama wajib diisi" })
    .trim()
    .min(2, "Nama minimal 2 karakter"),
  role: z
    .enum(["VIEWER", "COORDINATOR", "ADMIN"], {
      errorMap: () => ({ message: "Role harus berupa VIEWER, COORDINATOR, atau ADMIN" }),
    })
    .optional()
    .default("VIEWER"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "Password saat ini wajib diisi" })
      .min(1, "Password saat ini wajib diisi"),
    newPassword: z
      .string({ required_error: "Password baru wajib diisi" })
      .min(6, "Password baru minimal 6 karakter"),
    confirmPassword: z.string().optional(),
  })
  .refine(
    (data) => !data.confirmPassword || data.newPassword === data.confirmPassword,
    {
      message: "Konfirmasi password baru tidak cocok",
      path: ["confirmPassword"],
    }
  );
