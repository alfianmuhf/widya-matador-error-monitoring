import createError from "http-errors";
import * as telegramRepository from "./telegram.repository.js";

/**
 * Admin adds a Telegram user to whitelist
 * @param {object} data - { telegramId, username, fullName, isActive }
 * @param {string} adminId - Current admin ID
 */
export const createTelegramUser = async ({ telegramId, username, fullName, isActive }, adminId) => {
  // 1. Check if telegramId already whitelisted
  const existingUser = await telegramRepository.findTelegramUserByTelegramId(telegramId);
  if (existingUser) {
    throw createError(409, "Telegram ID sudah terdaftar di daftar whitelist.");
  }

  // 2. Insert into database
  return telegramRepository.createTelegramUser({
    telegramId,
    username: username || null,
    fullName: fullName || null,
    isActive: isActive !== undefined ? isActive : true,
    whitelistedById: adminId || null,
  });
};

/**
 * Get paginated list of whitelisted Telegram users
 * @param {object} query
 */
export const getTelegramUsers = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const search = typeof query.search === "string" ? query.search.trim() : undefined;

  let isActive;
  if (query.isActive === "true" || query.isActive === true) {
    isActive = true;
  } else if (query.isActive === "false" || query.isActive === false) {
    isActive = false;
  }

  const { telegramUsers, total } = await telegramRepository.findTelegramUsers({
    skip,
    take: limit,
    search,
    isActive,
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    telegramUsers,
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
};

/**
 * Get single Telegram user detail
 * @param {string} id
 */
export const getTelegramUserById = async (id) => {
  const user = await telegramRepository.findTelegramUserById(id);
  if (!user) {
    throw createError(404, "User Telegram tidak ditemukan");
  }
  return user;
};

/**
 * Admin updates Telegram user (status isActive, username, fullName)
 * @param {string} id
 * @param {object} data
 */
export const updateTelegramUser = async (id, data) => {
  // 1. Verify existence
  const existingUser = await telegramRepository.findTelegramUserById(id);
  if (!existingUser) {
    throw createError(404, "User Telegram tidak ditemukan");
  }

  // 2. Construct update payload
  const updatePayload = {};
  if (data.isActive !== undefined) updatePayload.isActive = data.isActive;
  if (data.username !== undefined) updatePayload.username = data.username || null;
  if (data.fullName !== undefined) updatePayload.fullName = data.fullName || null;

  return telegramRepository.updateTelegramUser(id, updatePayload);
};

/**
 * Admin removes Telegram user from whitelist
 * @param {string} id
 */
export const deleteTelegramUser = async (id) => {
  const existingUser = await telegramRepository.findTelegramUserById(id);
  if (!existingUser) {
    throw createError(404, "User Telegram tidak ditemukan");
  }

  await telegramRepository.deleteTelegramUser(id);
  return true;
};
