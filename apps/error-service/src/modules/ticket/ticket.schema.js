import { z } from "zod";

const validStatuses = ["open", "escalated", "solved"];

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
      message: "Status harus berupa open, escalated, atau solved",
    }),
  severity: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val ? val.toLowerCase() : undefined)),
  componentId: z.string().uuid("Format Component ID tidak valid").optional(),
  clientId: z.string().uuid("Format Client ID tidak valid").optional(),
  locationId: z.string().uuid("Format Location ID tidak valid").optional(),
  unitCode: z.string().trim().optional(),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  sortBy: z.enum(["createdAt", "created_at", "id", "ticketId"]).optional().default("createdAt"),
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
        message: "Status harus berupa open, escalated, atau solved",
      }),
    handlingNote: z.string().trim().optional(),
    comment: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    damageDescription: z.string().trim().optional(),
    actionTaken: z.string().trim().optional(),
    rootCause: z.string().trim().optional(),
    severity: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val ? val.toLowerCase() : undefined)),
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
    .string()
    .uuid("Format Component ID tidak valid")
    .optional(),
  failureCodeId: z
    .string({ required_error: "Failure Code ID wajib diisi" })
    .uuid("Format Failure Code ID tidak valid"),
  damageDescription: z.string().trim().optional(),
  actionTaken: z.string().trim().optional(),
  rootCause: z.string().trim().optional(),
  severity: z
    .enum(["rendah", "sedang", "tinggi", "Rendah", "Sedang", "Tinggi"])
    .optional()
    .default("rendah")
    .transform((val) => val.toLowerCase()),
  status: z
    .string()
    .trim()
    .optional()
    .default("open")
    .transform((val) => val.toLowerCase())
    .refine((val) => validStatuses.includes(val), {
      message: "Status harus berupa open, escalated, atau solved",
    }),
});

/**
 * Zod schema for adding a team member to ticket_assignees
 */
export const addAssigneeSchema = z
  .object({
    userId: z.string().uuid("Format User ID tidak valid").optional(),
    telegramUserId: z.string().uuid("Format Telegram User ID tidak valid").optional(),
    email: z.string().trim().email("Format email tidak valid").optional(),
    telegramId: z.string().trim().optional(),
    isLeader: z.boolean().optional(),
  })
  .refine((data) => data.userId || data.telegramUserId || data.email || data.telegramId, {
    message: "Harus menyertakan salah satu: userId, telegramUserId, email, atau telegramId",
  });

/**
 * Zod schema for editing a team member in ticket_assignees
 */
export const updateAssigneeSchema = z
  .object({
    userId: z.string().uuid("Format User ID tidak valid").nullable().optional(),
    telegramUserId: z.string().uuid("Format Telegram User ID tidak valid").nullable().optional(),
    email: z.string().trim().email("Format email tidak valid").optional(),
    telegramId: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.userId !== undefined ||
      data.telegramUserId !== undefined ||
      Boolean(data.email) ||
      Boolean(data.telegramId),
    {
      message: "Harus menyertakan data anggota baru (userId, telegramUserId, email, atau telegramId)",
    }
  );


/**
 * Zod schema for transferring leader to another assignee
 */
export const changeLeaderSchema = z
  .object({
    assigneeId: z.string().uuid("Format Assignee ID tidak valid").optional(),
    userId: z.string().uuid("Format User ID tidak valid").optional(),
    telegramUserId: z.string().uuid("Format Telegram User ID tidak valid").optional(),
  })
  .refine((data) => data.assigneeId || data.userId || data.telegramUserId, {
    message: "Harus menyertakan assigneeId, userId, atau telegramUserId baru",
  });

/**
 * Zod schema for querying ticket history
 */
export const queryHistorySchema = z.object({
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});
