import prisma from "../../config/prisma.js";

/**
 * Find single Telegram user by internal UUID
 * @param {string} id
 */
export const findTelegramUserById = async (id) => {
  return prisma.telegram_users.findUnique({
    where: { id },
  });
};

/**
 * Find single Telegram user by their Telegram numeric ID
 * @param {string} telegramId
 */
export const findTelegramUserByTelegramId = async (telegramId) => {
  return prisma.telegram_users.findUnique({
    where: { telegram_id: telegramId },
  });
};

/**
 * Add a new Telegram user to whitelist
 * @param {object} data
 */
export const createTelegramUser = async (data) => {
  return prisma.telegram_users.create({
    data: {
      telegram_id: data.telegram_id || data.telegramId,
      username: data.username || null,
      full_name: data.full_name || data.fullName || null,
      division: data.division || null,
      is_active: data.is_active ?? data.isActive ?? true,
    },
  });
};

/**
 * Get paginated list of whitelisted Telegram users with filtering
 * @param {object} params
 */
export const findTelegramUsers = async ({ skip = 0, take = 10, search, division, isActive }) => {
  const where = {
    ...(search
      ? {
          OR: [
            { telegram_id: { contains: search, mode: "insensitive" } },
            { username: { contains: search, mode: "insensitive" } },
            { full_name: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(division ? { division: division.toLowerCase() } : {}),
    ...(isActive !== undefined ? { is_active: isActive } : {}),
  };

  const [telegramUsers, total] = await Promise.all([
    prisma.telegram_users.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.telegram_users.count({ where }),
  ]);

  return { telegramUsers, total };
};

/**
 * Update Telegram user data (e.g. status is_active, username, full_name, division)
 * @param {string} id
 * @param {object} data
 */
export const updateTelegramUser = async (id, data) => {
  const updateData = {};
  if (data.is_active !== undefined) updateData.is_active = data.is_active;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  if (data.username !== undefined) updateData.username = data.username;
  if (data.full_name !== undefined) updateData.full_name = data.full_name;
  if (data.fullName !== undefined) updateData.full_name = data.fullName;
  if (data.division !== undefined) updateData.division = data.division ? data.division.toLowerCase() : null;

  return prisma.telegram_users.update({
    where: { id },
    data: updateData,
  });
};

/**
 * Delete Telegram user from whitelist
 * @param {string} id
 */
export const deleteTelegramUser = async (id) => {
  return prisma.telegram_users.delete({
    where: { id },
  });
};

/**
 * Count active relations / foreign keys referencing this Telegram user
 * @param {object} user - telegram_users entity
 */
export const countTelegramUserDependencies = async (user) => {
  const [ticketHistories, auditLogs, ticketAssignees, botSessions] = await Promise.all([
    prisma.ticket_history.count({ where: { changed_by_telegram_user_id: user.id } }),
    prisma.audit_logs.count({ where: { actor_telegram_user_id: user.id } }),
    prisma.ticket_assignees.count({ where: { telegram_user_id: user.id } }),
    prisma.bot_sessions.count({ where: { telegram_id: user.telegram_id } }),
  ]);

  return {
    ticketHistories,
    auditLogs,
    ticketAssignees,
    botSessions,
    total: ticketHistories + auditLogs + ticketAssignees + botSessions,
  };
};
