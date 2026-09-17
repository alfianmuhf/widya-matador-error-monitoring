import { z } from "zod";

export const createAssetSchema = z.object({
  unitCode: z
    .string({ required_error: "Unit code wajib diisi" })
    .trim()
    .min(2, "Unit code minimal 2 karakter")
    .max(50, "Unit code maksimal 50 karakter"),
  type: z
    .string({ required_error: "Tipe asset wajib diisi" })
    .trim()
    .min(1, "Tipe asset wajib diisi"),
  clientId: z
    .string({ required_error: "Client ID wajib diisi" })
    .uuid("Format Client ID tidak valid"),
  locationId: z
    .string({ required_error: "Location ID wajib diisi" })
    .uuid("Format Location ID tidak valid"),
  status: z
    .string({ required_error: "Status asset wajib diisi" })
    .trim()
    .min(1, "Status asset wajib diisi"),
  commissioningDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"))
    .optional()
    .nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateAssetSchema = z
  .object({
    unitCode: z
      .string()
      .trim()
      .min(2, "Unit code minimal 2 karakter")
      .max(50, "Unit code maksimal 50 karakter")
      .optional(),
    type: z.string().trim().min(1).optional(),
    clientId: z.string().uuid("Format Client ID tidak valid").optional(),
    locationId: z.string().uuid("Format Location ID tidak valid").optional(),
    status: z.string().trim().min(1).optional(),
    commissioningDate: z
      .string()
      .datetime({ offset: true })
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD"))
      .optional()
      .nullable(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Minimal satu kolom harus disertakan untuk pembaruan",
  });

export const queryAssetSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
  clientId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  type: z.string().trim().optional(),
  status: z.string().trim().optional(),
  search: z.string().trim().optional(),
  isActive: z
    .enum(["true", "false", "all"])
    .optional()
    .default("all"),
});
