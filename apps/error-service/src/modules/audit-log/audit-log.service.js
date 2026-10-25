import createError from "http-errors";
import * as auditLogRepo from "./audit-log.repository.js";
import { auditLogEvents } from "./audit-log.events.js";
import prisma from "../../config/prisma.js";

/**
 * Format audit log entry to standard display format:
 * - Waktu: YYYY-MM-DD HH:mm
 * - Pelaku: email / username / actor
 * - Objek: entity_type:identifier (e.g. asset:LSP-018, ticket:ERR-20260907-0003)
 * - Aksi: create, update, status_change, delete
 * - Detail perubahan: human-readable change description
 */
export const formatAuditLog = (log) => {
  if (!log) return null;

  const createdAt = log.created_at || log.createdAt;

  // 1. Format Waktu: YYYY-MM-DD HH:mm (WIB UTC+7)
  const d = new Date(createdAt);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);
  const yyyy = wib.getFullYear();
  const mm = String(wib.getMonth() + 1).padStart(2, "0");
  const dd = String(wib.getDate()).padStart(2, "0");
  const hh = String(wib.getHours()).padStart(2, "0");
  const min = String(wib.getMinutes()).padStart(2, "0");
  const waktu = `${yyyy}-${mm}-${dd} ${hh}:${min}`;

  const user = log.user || log.actorUser;
  const telegramUser = log.telegram_user || log.actorTelegram;
  const actorName = log.actor_name || log.actor;
  const actorUserId = log.actor_user_id || log.actorUserId;
  const actorTelegramId = log.actor_telegram_user_id || log.actorTelegramId;
  const entityType = log.entity_type || log.entityType;
  const entityId = log.entity_id || log.entityId;
  const deleteType = (log.delete_type || log.deleteAction || "none").toLowerCase();

  // 2. Format Pelaku (Web User: email, Telegram User: @username)
  let pelaku = "Sistem";
  if (user?.email) {
    pelaku = user.email;
  } else if (telegramUser) {
    if (telegramUser.username) {
      const u = telegramUser.username.trim();
      pelaku = u.startsWith("@") ? u : `@${u}`;
    } else if (telegramUser.full_name || telegramUser.fullName) {
      pelaku = `@${telegramUser.full_name || telegramUser.fullName}`;
    } else if (telegramUser.telegram_id || telegramUser.telegramId) {
      pelaku = `@${telegramUser.telegram_id || telegramUser.telegramId}`;
    } else {
      pelaku = actorName || "Telegram User";
    }
  } else if (actorUserId) {
    pelaku = user?.email || (actorName?.includes("@") ? actorName : null) || actorName || "Sistem";
  } else if (actorTelegramId) {
    if (telegramUser?.username) {
      const u = telegramUser.username.trim();
      pelaku = u.startsWith("@") ? u : `@${u}`;
    } else if (actorName?.startsWith("@")) {
      pelaku = actorName;
    } else {
      pelaku = actorName || "Telegram User";
    }
  } else if (actorName) {
    pelaku = actorName;
  }

  // 3. Format Objek: ${entity_type}:${identifier}
  let entityTypeLower = String(entityType || "data")
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");

  let iden =
    log.details?.identifier ||
    log.details?.unitCode ||
    log.details?.unit_code ||
    log.details?.ticketId ||
    log.details?.code ||
    log.details?.name ||
    (log.details?.username ? (log.details.username.startsWith("@") ? log.details.username : `@${log.details.username}`) : null) ||
    entityId ||
    "-";

  if (entityTypeLower === "telegram_user" && typeof iden === "string" && !iden.startsWith("@") && isNaN(iden)) {
    iden = `@${iden}`;
  }

  const objek = `${entityTypeLower}:${iden}`;

  // 4. Format Aksi (lowercase: create, update, status_change, delete)
  let aksi = String(log.action || "update").toLowerCase();
  if (log.details?.isStatusChange || aksi === "status_change") {
    aksi = "status_change";
  }

  // 5. Format Detail Perubahan
  let detailPerubahan = "-";
  if (log.details?.changeSummary) {
    detailPerubahan = log.details.changeSummary;
  } else if (log.details?.reason) {
    detailPerubahan = log.details.reason;
  } else if (log.details?.notes) {
    detailPerubahan = log.details.notes;
  } else if (aksi === "create") {
    detailPerubahan = `tambah ${entityTypeLower.replace(/_/g, " ")} baru`;
  } else if (aksi === "delete") {
    detailPerubahan = deleteType === "soft" ? "nonaktifkan (soft delete)" : "hapus permanen";
  } else if (log.details?.changes) {
    detailPerubahan = Object.entries(log.details.changes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
  }

  return {
    id: log.id,
    waktu,
    pelaku,
    objek,
    aksi,
    detailPerubahan,
    // Raw fields for FE compatibility
    deleteAction: deleteType.toUpperCase(),
    delete_type: deleteType,
    entityType,
    entity_type: entityType,
    entityId,
    entity_id: entityId,
    createdAt,
    created_at: createdAt,
    details: log.details,
  };
};

/**
 * Record an audit log entry in the database.
 */
export const recordLog = async ({
  actor = null,
  actorUserId = null,
  actorTelegramId = null,
  action,
  deleteAction = "NONE",
  deleteType = null,
  entityType,
  entityId = null,
  details = null,
  ipAddress = null,
}) => {
  try {
    const rawAction = String(action || "").trim();
    const isStatusChange = rawAction.toLowerCase() === "status_change";
    const normAction = isStatusChange ? "STATUS_CHANGE" : rawAction.toUpperCase();

    // delete_type is enum: none, soft, hard
    const rawDelete = deleteType || deleteAction || "none";
    let finalDeleteType = "none";
    if (normAction === "DELETE") {
      finalDeleteType = ["soft", "hard"].includes(String(rawDelete).toLowerCase())
        ? String(rawDelete).toLowerCase()
        : "hard";
    }

    const payloadDetails = details ? { ...details } : {};
    if (isStatusChange) {
      payloadDetails.isStatusChange = true;
    }

    let resolvedActor = actor;
    let finalActorUserId = actorUserId || null;
    let finalActorTelegramId = actorTelegramId || null;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // Jika finalActorUserId ada tetapi resolvedActor belum terisi
    if (finalActorUserId && !resolvedActor) {
      try {
        const u = await prisma.users.findUnique({
          where: { id: finalActorUserId },
          select: { username: true, name: true },
        });
        if (u?.username) resolvedActor = u.username;
      } catch (e) {
        // ignore
      }
    }

    // Jika actorTelegramId ada
    if (actorTelegramId) {
      try {
        if (uuidRegex.test(actorTelegramId)) {
          const tg = await prisma.telegram_users.findUnique({
            where: { id: actorTelegramId },
            select: { username: true, full_name: true, telegram_id: true },
          });
          if (tg && !resolvedActor) {
            resolvedActor = tg.username ? `@${tg.username}` : (tg.full_name || tg.telegram_id);
          }
        } else {
          // ID telegram mentah (angka atau username)
          const tg = await prisma.telegram_users.findFirst({
            where: {
              OR: [
                { telegram_id: String(actorTelegramId) },
                { username: String(actorTelegramId).replace(/^@/, "") },
              ],
            },
          });
          if (tg) {
            finalActorTelegramId = tg.id;
            if (!resolvedActor) {
              resolvedActor = tg.username ? `@${tg.username}` : (tg.full_name || tg.telegram_id);
            }
          } else {
            finalActorTelegramId = null;
            if (!resolvedActor) {
              resolvedActor = String(actorTelegramId).startsWith("@") ? actorTelegramId : `@${actorTelegramId}`;
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }

    const created = await auditLogRepo.create({
      actor_name: resolvedActor || (finalActorUserId ? `User:${finalActorUserId}` : "Sistem"),
      actor_user_id: finalActorUserId,
      actor_telegram_user_id: finalActorTelegramId,
      action: normAction,
      delete_type: finalDeleteType,
      entity_type: entityType,
      entity_id: entityId ? String(entityId) : null,
      details: payloadDetails,
      ip_address: ipAddress || null,
    });

    // Format log and broadcast through SSE
    const formatted = formatAuditLog(created);
    auditLogEvents.notifyLogCreated(formatted);

    return created;
  } catch (error) {
    console.error("⚠️ Failed to write audit log:", error.message);
    return null;
  }
};

/**
 * Get paginated list of audit logs with filtering and standardized display format
 */
export const getAuditLogs = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const where = {};

  if (query.entityType || query.entity_type) {
    where.entity_type = { equals: query.entityType || query.entity_type, mode: "insensitive" };
  }

  if (query.action) {
    where.action = { equals: query.action.toUpperCase() };
  }

  const deleteFilter = query.delete_type || query.deleteAction;
  if (deleteFilter && deleteFilter.toUpperCase() !== "ALL") {
    where.delete_type = deleteFilter.toLowerCase();
  }

  if (query.actorUserId || query.actor_user_id) {
    where.actor_user_id = query.actorUserId || query.actor_user_id;
  }

  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { actor_name: { contains: s, mode: "insensitive" } },
      { entity_type: { contains: s, mode: "insensitive" } },
      { entity_id: { contains: s, mode: "insensitive" } },
      { action: { contains: s, mode: "insensitive" } },
      { user: { username: { contains: s, mode: "insensitive" } } },
      { user: { name: { contains: s, mode: "insensitive" } } },
    ];
  }

  const [logs, total] = await Promise.all([
    auditLogRepo.findMany({ skip, take: limit, where }),
    auditLogRepo.count(where),
  ]);

  return {
    logs: logs.map(formatAuditLog),
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get single audit log detail by ID
 */
export const getAuditLogById = async (id) => {
  const log = await auditLogRepo.findById(id);
  if (!log) {
    throw createError(404, "Audit log tidak ditemukan");
  }
  return formatAuditLog(log);
};
