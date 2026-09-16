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
    .enum(["ADMIN", "COORDINATOR", "VIEWER"], {
      errorMap: () => ({ message: "Role harus berupa ADMIN, COORDINATOR, atau VIEWER" }),
    })
    .optional()
    .default("VIEWER"),
});
