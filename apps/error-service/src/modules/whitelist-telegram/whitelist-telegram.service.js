import createError from "http-errors";
import * as telegramRepository from "./whitelist-telegram.repository.js";
import { recordLog } from "../audit-log/audit-log.service.js";

/**
 * Admin adds a Telegram user to whitelist
 * @param {object} data - { telegramId, username, fullName, isActive }
 * @param {object|string} adminUser - Current admin user object or ID
 */
export const createTelegramUser = async ({ telegramId, username, fullName, isActive }, adminUser = null) => {
  const adminId = typeof adminUser === "object" ? adminUser?.id : adminUser;
  const adminActor = typeof adminUser === "object" ? (adminUser?.email || adminUser?.name) : (adminUser ? `User:${adminId}` : "Sistem");

  // 1. Check if telegramId already whitelisted
  const existingUser = await telegramRepository.findTelegramUserByTelegramId(telegramId);
  if (existingUser) {
    throw createError(409, "Telegram ID sudah terdaftar di daftar whitelist.");
  }

  // 2. Insert into database
  const created = await telegramRepository.createTelegramUser({
    telegramId,
    username: username || null,
    fullName: fullName || null,
    isActive: isActive !== undefined ? isActive : true,
    whitelistedById: adminId || null,
  });

  const displayHandle = created.username ? (created.username.startsWith("@") ? created.username : `@${created.username}`) : created.telegramId;

  await recordLog({
    actor: adminActor,
    actorUserId: adminId || null,
    action: "CREATE",
    deleteAction: "NONE",
    entityType: "TelegramUser",
    entityId: created.id,
    details: {
      identifier: displayHandle,
      changeSummary: `tambah whitelist telegram '${displayHandle}'`,
      telegramId: created.telegramId,
      username: created.username,
      fullName: created.fullName,
      isActive: created.isActive,
    },
  });

  return created;
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
 * @param {object|string} adminUser
 */
export const updateTelegramUser = async (id, data, adminUser = null) => {
  const adminId = typeof adminUser === "object" ? adminUser?.id : adminUser;
  const adminActor = typeof adminUser === "object" ? (adminUser?.email || adminUser?.name) : (adminUser ? `User:${adminId}` : "Sistem");

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

  const updated = await telegramRepository.updateTelegramUser(id, updatePayload);

  const displayHandle = updated.username ? (updated.username.startsWith("@") ? updated.username : `@${updated.username}`) : updated.telegramId;

  const changes = [];
  if (data.isActive !== undefined && data.isActive !== existingUser.isActive) {
    changes.push(`is_active: ${existingUser.isActive} → ${data.isActive}`);
  }
  if (data.username !== undefined && data.username !== existingUser.username) {
    changes.push(`username: ${existingUser.username || "-"} → ${data.username}`);
  }
  if (data.fullName !== undefined && data.fullName !== existingUser.fullName) {
    changes.push(`nama: ${existingUser.fullName || "-"} → ${data.fullName}`);
  }
  const changeSummary = changes.length > 0 ? changes.join(", ") : "perubahan whitelist telegram";

  await recordLog({
    actor: adminActor,
    actorUserId: adminId || null,
    action: "UPDATE",
    deleteAction: "NONE",
    entityType: "TelegramUser",
    entityId: updated.id,
    details: {
      identifier: displayHandle,
      changeSummary,
      before: { isActive: existingUser.isActive, username: existingUser.username },
      after: updatePayload,
    },
  });

  return updated;
};

/**
 * Admin removes Telegram user from whitelist (Smart Delete)
 * @param {string} id
 * @param {object|string} adminUser
 */
export const deleteTelegramUser = async (id, adminUser = null) => {
  const adminId = typeof adminUser === "object" ? adminUser?.id : adminUser;
  const adminActor = typeof adminUser === "object" ? (adminUser?.email || adminUser?.name) : (adminUser ? `User:${adminId}` : "Sistem");

  const existingUser = await telegramRepository.findTelegramUserById(id);
  if (!existingUser) {
    throw createError(404, "User Telegram tidak ditemukan");
  }

  const displayHandle = existingUser.username ? (existingUser.username.startsWith("@") ? existingUser.username : `@${existingUser.username}`) : existingUser.telegramId;

  // Constraint check: apakah ada yang nyangkut (Ticket, TicketHistory, AuditLog)?
  const dep = await telegramRepository.countTelegramUserDependencies(existingUser);

  if (dep.total > 0) {
    // Masih ada yang nyangkut -> JANGAN DI-HARD DELETE! Lakukan SOFT DELETE (isActive = false)
    const softDeleted = await telegramRepository.updateTelegramUser(id, { isActive: false });

    await recordLog({
      actor: adminActor,
      actorUserId: adminId || null,
      action: "DELETE",
      deleteAction: "SOFT",
      entityType: "TelegramUser",
      entityId: id,
      details: {
        identifier: displayHandle,
        changeSummary: `soft delete: dinonaktifkan (${dep.tickets} tiket terikat)`,
        reason: `Pengguna Telegram memiliki riwayat aktif (${dep.tickets} tiket, ${dep.ticketHistories} riwayat tiket). Entitas dinonaktifkan (Soft Delete).`,
        dependencies: dep,
        telegramId: existingUser.telegramId,
      },
    });

    return {
      telegramUser: softDeleted,
      deleteAction: "SOFT",
      message: `User Telegram memiliki riwayat terkait (${dep.total} data) sehingga dinonaktifkan (Soft Delete).`,
    };
  }

  // Tidak ada yang nyangkut -> Boleh HARD DELETE
  await telegramRepository.deleteTelegramUser(id);

  await recordLog({
    actor: adminActor,
    actorUserId: adminId || null,
    action: "DELETE",
    deleteAction: "HARD",
    entityType: "TelegramUser",
    entityId: id,
    details: {
      identifier: displayHandle,
      changeSummary: `hapus permanen user telegram '${displayHandle}'`,
      reason: "Tidak ada riwayat aktif terhubung. User Telegram dihapus secara permanen dari basis data.",
      telegramId: existingUser.telegramId,
      fullName: existingUser.fullName,
    },
  });

  return {
    telegramUser: { id, telegramId: existingUser.telegramId },
    deleteAction: "HARD",
    message: "User Telegram berhasil dihapus secara permanen (Hard Delete)",
  };
};
