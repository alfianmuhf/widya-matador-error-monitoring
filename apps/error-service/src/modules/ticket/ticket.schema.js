import { z } from "zod";

const validStatuses = ["open", "escalated", "solved", "closed"];

/**
 * Zod schema for querying tickets with filtering and pagination
 */
export const queryTicketsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(1000).optional().default(10),
  search: z.string().trim().optional(),
  status: z
    .string()
    .trim()
    .optional()
    .transform((val) => {
      if (!val || val.toLowerCase() === "all") return undefined;
      return val.toLowerCase();
    })
    .refine((val) => !val || validStatuses.includes(val), {
      message: "Status harus berupa open, escalated, solved, atau closed",
    }),
  severity: z
    .string()
    .trim()
    .optional(),
  componentId: z.string().uuid("Format Component ID tidak valid").optional(),
  clientId: z.string().uuid("Format Client ID tidak valid").optional(),
  locationId: z.string().uuid("Format Location ID tidak valid").optional(),
  unitCode: z.string().trim().optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "ticketId"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

/**
 * Zod schema for updating ticket status and adding handling notes / comments
 */
export const updateTicketSchema = z
  .object({
    status: z
      .string()
      .trim()
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        return val.toLowerCase();
      })
      .refine((val) => !val || validStatuses.includes(val), {
        message: "Status harus berupa open, escalated, solved, atau closed",
      }),
    handlingNote: z.string().trim().optional(),
    comment: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    damageDescription: z.string().trim().optional(),
    actionTaken: z.string().trim().optional(),
    rootCause: z.string().trim().optional(),
    severity: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.status !== undefined ||
      data.handlingNote !== undefined ||
      data.comment !== undefined ||
      data.notes !== undefined ||
      data.damageDescription !== undefined ||
      data.actionTaken !== undefined ||
      data.rootCause !== undefined ||
      data.severity !== undefined,
    {
      message: "Minimal satu field harus disertakan untuk pembaruan tiket",
    }
  );

/**
 * Zod schema for adding a comment / handling note specifically
 */
export const addCommentSchema = z.object({
  notes: z
    .string({ required_error: "Catatan komentar wajib diisi" })
    .trim()
    .min(1, "Catatan komentar minimal 1 karakter"),
});

/**
 * Zod schema for creating a ticket (from dashboard or API)
 */
export const createTicketSchema = z.object({
  unitCode: z
    .string({ required_error: "Unit code wajib diisi" })
    .trim()
    .min(1, "Unit code wajib diisi"),
  componentId: z
    .string({ required_error: "Component ID wajib diisi" })
    .uuid("Format Component ID tidak valid"),
  failureCodeId: z
    .string({ required_error: "Failure Code ID wajib diisi" })
    .uuid("Format Failure Code ID tidak valid"),
  damageDescription: z.string().trim().optional(),
  actionTaken: z.string().trim().optional(),
  rootCause: z.string().trim().optional(),
  severity: z.enum(["Rendah", "Sedang", "Tinggi"]).optional().default("Rendah"),
  status: z
    .string()
    .trim()
    .optional()
    .default("open")
    .transform((val) => val.toLowerCase())
    .refine((val) => validStatuses.includes(val), {
      message: "Status harus berupa open, escalated, solved, atau closed",
    }),
});
