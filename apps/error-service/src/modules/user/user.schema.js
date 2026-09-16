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
      .enum(["ADMIN", "COORDINATOR", "VIEWER"], {
        errorMap: () => ({ message: "Role harus berupa ADMIN, COORDINATOR, atau VIEWER" }),
      })
      .optional(),
    status: z
      .enum(["INVITED", "ACTIVE", "SUSPENDED"], {
        errorMap: () => ({ message: "Status harus berupa INVITED, ACTIVE, atau SUSPENDED" }),
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu field harus disertakan untuk pembaruan data",
  });

