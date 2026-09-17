import { z } from "zod";

export const createLocationSchema = z.object({
  name: z
    .string({ required_error: "Nama lokasi wajib diisi" })
    .trim()
    .min(2, "Nama lokasi minimal 2 karakter")
    .max(100, "Nama lokasi maksimal 100 karakter"),
  isActive: z.boolean().optional().default(true),
});

export const updateLocationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nama lokasi minimal 2 karakter")
      .max(100, "Nama lokasi maksimal 100 karakter")
      .optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu kolom harus disertakan untuk pembaruan",
  });

export const queryLocationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  search: z.string().trim().optional(),
  isActive: z
    .enum(["true", "false", "all"])
    .optional()
    .default("all"),
});
