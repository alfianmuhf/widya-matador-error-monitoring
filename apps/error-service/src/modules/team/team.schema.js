import { z } from "zod";

const UUID_SCHEMA = z.string().uuid("Format UUID tidak valid");

export const createTeamSchema = z.object({
  name: z
    .string()
    .min(3, "Nama tim minimal 3 karakter")
    .max(100, "Nama tim maksimal 100 karakter")
    .trim(),
  leaderUserId: UUID_SCHEMA,
  isActive: z.boolean().optional().default(true),
});

export const updateTeamSchema = z.object({
  name: z
    .string()
    .min(3, "Nama tim minimal 3 karakter")
    .max(100, "Nama tim maksimal 100 karakter")
    .trim()
    .optional(),
  leaderUserId: UUID_SCHEMA.optional(),
  isActive: z.boolean().optional(),
});

export const queryTeamsSchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(["true", "false", "all"]).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(50),
});

export const addTeamMemberSchema = z.object({
  userId: UUID_SCHEMA,
});

export const handoverTicketTeamSchema = z.object({
  teamId: UUID_SCHEMA,
  notes: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

export const assignTeamToTicketSchema = z.object({
  teamId: UUID_SCHEMA,
});
