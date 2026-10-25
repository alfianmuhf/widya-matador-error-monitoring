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
  sortBy: z
    .enum([
      "openAt",
      "open_at",
      "createdAt",
      "created_at",
      "escalatedAt",
      "escalated_at",
      "solvedAt",
      "solved_at",
      "id",
      "ticketId",
    ])
    .optional()
    .default("openAt"),
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
  aftersalesUserId: z.string().uuid("Format Aftersales User ID tidak valid").optional(),
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
 * Zod schema for transferring aftersales responsibility
 */
export const transferAftersalesSchema = z.object({
  aftersalesUserId: z
    .string({ required_error: "Target user Aftersales wajib dipilih" })
    .uuid("Format User ID Aftersales tidak valid"),
});

/**
 * Zod schema for claiming ticket by RnD team
 */
export const claimTicketSchema = z.object({
  teamId: z.string().uuid("Format Team ID tidak valid").optional(),
});

/**
 * Zod schema for assigning a team to a ticket
 */
export const assignTicketTeamSchema = z.object({
  teamId: z.string().uuid("Format Team ID tidak valid"),
});

/**
 * Zod schema for transferring / handing over primary responsibility to another team
 */
export const handoverTicketTeamSchema = z.object({
  teamId: z.string().uuid("Format Team ID tidak valid"),
  notes: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
});

/**
 * Backward compatibility: Zod schema for adding a team member / team to ticket
 */
export const addAssigneeSchema = z
  .object({
    teamId: z.string().uuid("Format Team ID tidak valid").optional(),
    userId: z.string().uuid("Format User ID tidak valid").optional(),
    username: z.string().trim().optional(),
    email: z.string().trim().optional(),
    isLeader: z.boolean().optional(),
  })
  .refine((data) => data.teamId || data.userId || data.username || data.email, {
    message: "Harus menyertakan teamId, userId, atau username pengguna",
  });

/**
 * Zod schema for editing a team member in ticket_assignees
 */
export const updateAssigneeSchema = z
  .object({
    teamId: z.string().uuid("Format Team ID tidak valid").optional(),
    userId: z.string().uuid("Format User ID tidak valid").nullable().optional(),
    telegramUserId: z.string().uuid("Format Telegram User ID tidak valid").nullable().optional(),
    username: z.string().trim().optional(),
    email: z.string().trim().optional(),
    telegramId: z.string().trim().optional(),
  })
  .refine(
    (data) =>
      data.teamId !== undefined ||
      data.userId !== undefined ||
      data.telegramUserId !== undefined ||
      Boolean(data.username) ||
      Boolean(data.email) ||
      Boolean(data.telegramId),
    {
      message: "Harus menyertakan data tim atau anggota baru",
    }
  );

/**
 * Zod schema for transferring leader / handover to another team or assignee
 */
export const changeLeaderSchema = z
  .object({
    teamId: z.string().uuid("Format Team ID tidak valid").optional(),
    assigneeId: z.string().uuid("Format Assignee ID tidak valid").optional(),
    userId: z.string().uuid("Format User ID tidak valid").optional(),
    telegramUserId: z.string().uuid("Format Telegram User ID tidak valid").optional(),
    notes: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
    removeOldTeam: z.boolean().optional(),
  })
  .refine((data) => data.teamId || data.assigneeId || data.userId || data.telegramUserId, {
    message: "Harus menyertakan teamId, assigneeId, userId, atau telegramUserId baru",
  });

/**
 * Zod schema for querying ticket history
 */
export const queryHistorySchema = z.object({
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});
