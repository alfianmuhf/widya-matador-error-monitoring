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
