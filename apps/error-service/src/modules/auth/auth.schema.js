import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string({ required_error: "Username wajib diisi" })
    .trim()
    .min(3, "Username minimal 3 karakter")
    .optional(),
  email: z.string().trim().optional(),
  password: z
    .string({ required_error: "Password wajib diisi" })
    .min(6, "Password minimal 6 karakter"),
}).refine((data) => data.username || data.email, {
  message: "Username wajib diisi",
  path: ["username"],
});

export const forgotPasswordSchema = z.object({
  username: z
    .string({ required_error: "Username wajib diisi" })
    .trim()
    .min(3, "Username minimal 3 karakter")
    .optional(),
  email: z.string().trim().optional(),
}).refine((data) => data.username || data.email, {
  message: "Username wajib diisi",
  path: ["username"],
});

export const resetPasswordSchema = z.object({
  username: z
    .string({ required_error: "Username wajib diisi" })
    .trim()
    .min(3, "Username minimal 3 karakter")
    .optional(),
  email: z.string().trim().optional(),
  otp: z
    .string({ required_error: "OTP wajib diisi" })
    .trim()
    .regex(/^\d{6}$/, "OTP harus 6 digit angka"),
  newPassword: z
    .string({ required_error: "Password baru wajib diisi" })
    .min(6, "Password minimal 6 karakter"),
}).refine((data) => data.username || data.email, {
  message: "Username wajib diisi",
  path: ["username"],
});

export const registerSchema = z.object({
  username: z
    .string({ required_error: "Username wajib diisi" })
    .trim()
    .min(3, "Username minimal 3 karakter"),
  password: z
    .string({ required_error: "Password wajib diisi" })
    .min(6, "Password minimal 6 karakter"),
  name: z
    .string({ required_error: "Nama wajib diisi" })
    .trim()
    .min(2, "Nama minimal 2 karakter"),
  role: z
    .enum(["VIEWER", "COORDINATOR", "ADMIN", "viewer", "coordinator", "admin"], {
      errorMap: () => ({ message: "Role harus berupa VIEWER, COORDINATOR, atau ADMIN" }),
    })
    .optional()
    .default("viewer"),
  division: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
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
