import createError from "http-errors";
import * as telegramRepository from "./whitelist-telegram.repository.js";
import { recordLog } from "../audit-log/audit-log.service.js";

const formatTelegramUser = (user) => {
  if (!user) return null;
  return {
    id: user.id,
    telegramId: user.telegram_id,
    telegram_id: user.telegram_id,
    username: user.username,
    fullName: user.full_name,
    full_name: user.full_name,
    division: user.division,
    isActive: user.is_active,
    is_active: user.is_active,
    createdAt: user.created_at,
    created_at: user.created_at,
    updatedAt: user.updated_at,
    updated_at: user.updated_at,
  };
};

/**
 * Admin adds a Telegram user to whitelist
 * @param {object} data - { telegramId, username, fullName, division, isActive }
 * @param {object|string} adminUser - Current admin user object or ID
 */
export const createTelegramUser = async ({ telegramId, username, fullName, division, isActive }, adminUser = null) => {
  const adminId = typeof adminUser === "object" ? adminUser?.id : adminUser;
  const adminActor = typeof adminUser === "object" ? (adminUser?.email || adminUser?.name) : (adminUser ? `User:${adminId}` : "Sistem");

  const cleanUsername = username ? String(username).replace(/^@/, "").trim() : null;
  if (!cleanUsername) {
    throw createError(400, "Username Telegram wajib diisi.");
  }

  // 1. Cek duplikasi username Telegram
  const existingByUsername = await telegramRepository.findTelegramUserByUsername(cleanUsername);
  if (existingByUsername) {
    throw createError(409, "Username Telegram sudah terdaftar di daftar whitelist.");
  }

  // 1b. Jika telegramId disertakan, cek duplikasi telegramId
  const cleanTeleId = telegramId ? String(telegramId).trim() : null;
  if (cleanTeleId) {
    const existingUser = await telegramRepository.findTelegramUserByTelegramId(cleanTeleId);
    if (existingUser) {
      throw createError(409, "Telegram ID sudah terdaftar di daftar whitelist.");
    }
  }

  // 2. Insert into database (whitelisted_by is tracked in audit log)
  const created = await telegramRepository.createTelegramUser({
    telegram_id: cleanTeleId || null,
    username: cleanUsername,
    full_name: fullName ? String(fullName).trim() : null,
    division: division ? division.toLowerCase() : null,
    is_active: isActive !== undefined ? isActive : true,
  });

  const displayHandle = created.username
    ? (created.username.startsWith("@") ? created.username : `@${created.username}`)
    : created.telegram_id;

  // 3. Record in audit log
  await recordLog({
    actor: adminActor,
    actorUserId: adminId || null,
    action: "CREATE",
    deleteAction: "NONE",
    entityType: "TelegramUser",
    entityId: created.id,
    details: {
      identifier: displayHandle,
      changeSummary: `tambah whitelist telegram '${displayHandle}' oleh ${adminUser?.email || adminUser?.name || "admin"}`,
      whitelistedBy: adminUser?.email || adminUser?.name || adminId || "Sistem",
      telegramId: created.telegram_id,
      username: created.username,
      fullName: created.full_name,
      division: created.division,
      isActive: created.is_active,
    },
  });

  return formatTelegramUser(created);
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
  const division = typeof query.division === "string" ? query.division.trim() : undefined;

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
    division,
    isActive,
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    telegramUsers: telegramUsers.map(formatTelegramUser),
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
  return formatTelegramUser(user);
};

/**
 * Admin updates Telegram user (status is_active, username, full_name, division)
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
  if (data.isActive !== undefined) updatePayload.is_active = data.isActive;
  if (data.is_active !== undefined) updatePayload.is_active = data.is_active;

  if (data.username !== undefined) {
    const cleanUsername = data.username ? String(data.username).replace(/^@/, "").trim() : null;
    if (cleanUsername) {
      const duplicateUser = await telegramRepository.findTelegramUserByUsername(cleanUsername);
      if (duplicateUser && duplicateUser.id !== id) {
        throw createError(409, "Username Telegram sudah digunakan oleh akun whitelist lain.");
      }
    }
    updatePayload.username = cleanUsername;
  }

  if (data.fullName !== undefined) updatePayload.full_name = data.fullName ? String(data.fullName).trim() : null;
  if (data.full_name !== undefined) updatePayload.full_name = data.full_name ? String(data.full_name).trim() : null;
  if (data.telegramId !== undefined || data.telegram_id !== undefined) {
    const rawTeleId = data.telegramId !== undefined ? data.telegramId : data.telegram_id;
    const cleanTeleId = rawTeleId ? String(rawTeleId).trim() : null;
    if (cleanTeleId) {
      const duplicateTeleId = await telegramRepository.findTelegramUserByTelegramId(cleanTeleId);
      if (duplicateTeleId && duplicateTeleId.id !== id) {
        throw createError(409, "Telegram ID sudah digunakan oleh akun whitelist lain.");
      }
    }
    updatePayload.telegram_id = cleanTeleId;
  }
  if (data.division !== undefined) updatePayload.division = data.division ? data.division.toLowerCase() : null;

  const updated = await telegramRepository.updateTelegramUser(id, updatePayload);

  const displayHandle = updated.username
    ? (updated.username.startsWith("@") ? updated.username : `@${updated.username}`)
    : updated.telegram_id;

  const changes = [];
  if (updatePayload.is_active !== undefined && updatePayload.is_active !== existingUser.is_active) {
    changes.push(`is_active: ${existingUser.is_active} → ${updatePayload.is_active}`);
  }
  if (data.username !== undefined && data.username !== existingUser.username) {
    changes.push(`username: ${existingUser.username || "-"} → ${data.username}`);
  }
  if (updatePayload.full_name !== undefined && updatePayload.full_name !== existingUser.full_name) {
    changes.push(`nama: ${existingUser.full_name || "-"} → ${updatePayload.full_name}`);
  }
  if (updatePayload.division !== undefined && updatePayload.division !== existingUser.division) {
    changes.push(`divisi: ${existingUser.division || "-"} → ${updatePayload.division}`);
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
      before: { isActive: existingUser.is_active, username: existingUser.username, division: existingUser.division },
      after: updatePayload,
    },
  });

  return formatTelegramUser(updated);
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

  const displayHandle = existingUser.username
    ? (existingUser.username.startsWith("@") ? existingUser.username : `@${existingUser.username}`)
    : existingUser.telegram_id;

  // Constraint check: apakah ada yang nyangkut?
  const dep = await telegramRepository.countTelegramUserDependencies(existingUser);

  if (dep.total > 0) {
    // Masih ada yang nyangkut -> SOFT DELETE (is_active = false)
    const softDeleted = await telegramRepository.updateTelegramUser(id, { is_active: false });

    await recordLog({
      actor: adminActor,
      actorUserId: adminId || null,
      action: "DELETE",
      deleteAction: "SOFT",
      entityType: "TelegramUser",
      entityId: id,
      details: {
        identifier: displayHandle,
        changeSummary: `soft delete: dinonaktifkan (${dep.total} data terikat)`,
        reason: `Pengguna Telegram memiliki riwayat aktif (${dep.ticketHistories} riwayat tiket, ${dep.ticketAssignees} claim tiket). Entitas dinonaktifkan (Soft Delete).`,
        dependencies: dep,
        telegramId: existingUser.telegram_id,
      },
    });

    return {
      telegramUser: formatTelegramUser(softDeleted),
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
      telegramId: existingUser.telegram_id,
      fullName: existingUser.full_name,
    },
  });

  return {
    telegramUser: { id, telegramId: existingUser.telegram_id },
    deleteAction: "HARD",
    message: "User Telegram berhasil dihapus secara permanen (Hard Delete)",
  };
};
