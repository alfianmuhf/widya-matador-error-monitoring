import prisma from "../../config/prisma.js";

const includeWhitelistedBy = {
  whitelistedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
};

/**
 * Find single Telegram user by internal UUID
 * @param {string} id
 */
export const findTelegramUserById = async (id) => {
  return prisma.telegramUser.findUnique({
    where: { id },
    include: includeWhitelistedBy,
  });
};

/**
 * Find single Telegram user by their Telegram numeric ID
 * @param {string} telegramId
 */
export const findTelegramUserByTelegramId = async (telegramId) => {
  return prisma.telegramUser.findUnique({
    where: { telegramId },
    include: includeWhitelistedBy,
  });
};

/**
 * Add a new Telegram user to whitelist
 * @param {object} data
 */
export const createTelegramUser = async (data) => {
  return prisma.telegramUser.create({
    data,
    include: includeWhitelistedBy,
  });
};

/**
 * Get paginated list of whitelisted Telegram users with filtering
 * @param {object} params
 */
export const findTelegramUsers = async ({ skip = 0, take = 10, search, isActive }) => {
  const where = {
    ...(search
      ? {
          OR: [
            { telegramId: { contains: search, mode: "insensitive" } },
            { username: { contains: search, mode: "insensitive" } },
            { fullName: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(isActive !== undefined ? { isActive } : {}),
  };

  const [telegramUsers, total] = await Promise.all([
    prisma.telegramUser.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: includeWhitelistedBy,
    }),
    prisma.telegramUser.count({ where }),
  ]);

  return { telegramUsers, total };
};

/**
 * Update Telegram user data (e.g. status isActive, username, fullName)
 * @param {string} id
 * @param {object} data
 */
export const updateTelegramUser = async (id, data) => {
  return prisma.telegramUser.update({
    where: { id },
    data,
    include: includeWhitelistedBy,
  });
};

/**
 * Delete Telegram user from whitelist
 * @param {string} id
 */
export const deleteTelegramUser = async (id) => {
  return prisma.telegramUser.delete({
    where: { id },
  });
};

/**
 * Count active relations / foreign keys referencing this Telegram user
 * @param {object} user - TelegramUser entity
 */
export const countTelegramUserDependencies = async (user) => {
  const [tickets, ticketHistories, auditLogs] = await Promise.all([
    prisma.ticket.count({ where: { reporterTelegramId: user.telegramId } }),
    prisma.ticketHistory.count({ where: { changedByTelegramId: user.telegramId } }),
    prisma.auditLog.count({ where: { actorTelegramId: user.id } }),
  ]);

  return {
    tickets,
    ticketHistories,
    auditLogs,
    total: tickets + ticketHistories + auditLogs,
  };
};
