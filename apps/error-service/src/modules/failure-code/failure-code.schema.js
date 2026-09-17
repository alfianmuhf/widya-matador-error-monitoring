import { z } from "zod";

export const createFailureCodeSchema = z.object({
  componentId: z
    .string({ required_error: "ID komponen wajib diisi" })
    .uuid("Format ID komponen tidak valid"),
  code: z
    .string({ required_error: "Kode kegagalan (code) wajib diisi" })
    .trim()
    .min(1, "Kode kegagalan minimal 1 karakter")
    .max(50, "Kode kegagalan maksimal 50 karakter"),
  description: z.string().trim().max(500, "Deskripsi maksimal 500 karakter").optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateFailureCodeSchema = z
  .object({
    componentId: z.string().uuid("Format ID komponen tidak valid").optional(),
    code: z
      .string()
      .trim()
      .min(1, "Kode kegagalan minimal 1 karakter")
      .max(50, "Kode kegagalan maksimal 50 karakter")
      .optional(),
    description: z.string().trim().max(500, "Deskripsi maksimal 500 karakter").nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu kolom harus disertakan untuk pembaruan",
  });

export const queryFailureCodeSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  componentId: z.string().uuid().optional(),
  search: z.string().trim().optional(),
  isActive: z
    .enum(["true", "false", "all"])
    .optional()
    .default("all"),
});
