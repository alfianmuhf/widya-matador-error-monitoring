import { z } from "zod";

export const createComponentSchema = z.object({
  prefix: z
    .string({ required_error: "Prefix komponen wajib diisi" })
    .trim()
    .min(1, "Prefix minimal 1 karakter")
    .max(20, "Prefix maksimal 20 karakter")
    .transform((val) => val.toUpperCase()),
  name: z
    .string({ required_error: "Nama komponen wajib diisi" })
    .trim()
    .min(2, "Nama komponen minimal 2 karakter")
    .max(100, "Nama komponen maksimal 100 karakter"),
  sortOrder: z.coerce.number().int().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export const updateComponentSchema = z
  .object({
    prefix: z
      .string()
      .trim()
      .min(1, "Prefix minimal 1 karakter")
      .max(20, "Prefix maksimal 20 karakter")
      .transform((val) => val.toUpperCase())
      .optional(),
    name: z
      .string()
      .trim()
      .min(2, "Nama komponen minimal 2 karakter")
      .max(100, "Nama komponen maksimal 100 karakter")
      .optional(),
    sortOrder: z.coerce.number().int().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu kolom harus disertakan untuk pembaruan",
  });

export const queryComponentSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().trim().optional(),
  isActive: z
    .enum(["true", "false", "all"])
    .optional()
    .default("all"),
});
