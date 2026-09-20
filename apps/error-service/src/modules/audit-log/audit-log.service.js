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

  // 1. Format Waktu: YYYY-MM-DD HH:mm (WIB UTC+7)
  const d = new Date(log.createdAt);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);
  const yyyy = wib.getFullYear();
  const mm = String(wib.getMonth() + 1).padStart(2, "0");
  const dd = String(wib.getDate()).padStart(2, "0");
  const hh = String(wib.getHours()).padStart(2, "0");
  const min = String(wib.getMinutes()).padStart(2, "0");
  const waktu = `${yyyy}-${mm}-${dd} ${hh}:${min}`;

  // 2. Format Pelaku (Web User: email, Telegram User: @username)
  let pelaku = "Sistem";
  if (log.actorUser?.email) {
    pelaku = log.actorUser.email;
  } else if (log.actorTelegram) {
    if (log.actorTelegram.username) {
      const u = log.actorTelegram.username.trim();
      pelaku = u.startsWith("@") ? u : `@${u}`;
    } else if (log.actorTelegram.fullName) {
      pelaku = `@${log.actorTelegram.fullName}`;
    } else if (log.actorTelegram.telegramId) {
      pelaku = `@${log.actorTelegram.telegramId}`;
    } else {
      pelaku = log.actor || "Telegram User";
    }
  } else if (log.actorUserId) {
    pelaku = log.actorUser?.email || (log.actor?.includes("@") ? log.actor : null) || log.actor || "Sistem";
  } else if (log.actorTelegramId) {
    if (log.actorTelegram?.username) {
      const u = log.actorTelegram.username.trim();
      pelaku = u.startsWith("@") ? u : `@${u}`;
    } else if (log.actor?.startsWith("@")) {
      pelaku = log.actor;
    } else {
      pelaku = log.actor || "Telegram User";
    }
  } else if (log.actor) {
    pelaku = log.actor;
  }

  // 3. Format Objek: ${entity_type}:${identifier}
  let entityTypeLower = String(log.entityType || "data")
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");

  let iden =
    log.details?.identifier ||
    log.details?.unitCode ||
    log.details?.ticketId ||
    log.details?.code ||
    log.details?.name ||
    (log.details?.username ? (log.details.username.startsWith("@") ? log.details.username : `@${log.details.username}`) : null) ||
    log.entityId ||
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
    detailPerubahan = log.deleteAction === "SOFT" ? "nonaktifkan (soft delete)" : "hapus permanen";
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
    // Raw fields for background operations
    deleteAction: log.deleteAction,
    entityType: log.entityType,
    entityId: log.entityId,
    createdAt: log.createdAt,
    details: log.details,
  };
};

/**
 * Record an audit log entry in the database.
 * Rule: deleteAction is strictly for action === "DELETE" ("SOFT" or "HARD").
 * For any other action, deleteAction is always "NONE".
 */
export const recordLog = async ({
  actor = null,
  actorUserId = null,
  actorTelegramId = null,
  action,
  deleteAction = "NONE",
  entityType,
  entityId = null,
  details = null,
}) => {
  try {
    const rawAction = String(action || "").trim();
    const isStatusChange = rawAction.toLowerCase() === "status_change";
    const normAction = isStatusChange ? "STATUS_CHANGE" : rawAction.toUpperCase();

    // deleteAction is strictly for DELETE
    let finalDeleteAction = "NONE";
    if (normAction === "DELETE") {
      finalDeleteAction = ["SOFT", "HARD"].includes(String(deleteAction).toUpperCase())
        ? String(deleteAction).toUpperCase()
        : "HARD";
    }

    const payloadDetails = details ? { ...details } : {};
    if (isStatusChange) {
      payloadDetails.isStatusChange = true;
    }

    let resolvedActor = actor;
    let finalActorUserId = actorUserId || null;
    let finalActorTelegramId = actorTelegramId || null;

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    // Jika actorUserId ada tetapi actor belum berupa email
    if (finalActorUserId && (!resolvedActor || !resolvedActor.includes("@"))) {
      try {
        const u = await prisma.user.findUnique({
          where: { id: finalActorUserId },
          select: { email: true, name: true },
        });
        if (u?.email) resolvedActor = u.email;
      } catch (e) {
        // ignore
      }
    }

    // Jika actorTelegramId ada
    if (actorTelegramId) {
      try {
        if (uuidRegex.test(actorTelegramId)) {
          const tg = await prisma.telegramUser.findUnique({
            where: { id: actorTelegramId },
            select: { username: true, fullName: true, telegramId: true },
          });
          if (tg && !resolvedActor) {
            resolvedActor = tg.username ? `@${tg.username}` : (tg.fullName || tg.telegramId);
          }
        } else {
          // ID telegram mentah (angka atau username)
          const tg = await prisma.telegramUser.findFirst({
            where: {
              OR: [
                { telegramId: String(actorTelegramId) },
                { username: String(actorTelegramId).replace(/^@/, "") },
              ],
            },
          });
          if (tg) {
            finalActorTelegramId = tg.id;
            if (!resolvedActor) {
              resolvedActor = tg.username ? `@${tg.username}` : (tg.fullName || tg.telegramId);
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
      actor: resolvedActor || (finalActorUserId ? `User:${finalActorUserId}` : "Sistem"),
      actorUserId: finalActorUserId,
      actorTelegramId: finalActorTelegramId,
      action: normAction,
      deleteAction: finalDeleteAction,
      entityType,
      entityId: entityId ? String(entityId) : null,
      details: payloadDetails,
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

  if (query.entityType) {
    where.entityType = { equals: query.entityType, mode: "insensitive" };
  }

  if (query.action) {
    where.action = { equals: query.action.toUpperCase() };
  }

  if (query.deleteAction && query.deleteAction !== "ALL") {
    where.deleteAction = query.deleteAction.toUpperCase();
  }

  if (query.actorUserId) {
    where.actorUserId = query.actorUserId;
  }

  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { actor: { contains: s, mode: "insensitive" } },
      { entityType: { contains: s, mode: "insensitive" } },
      { entityId: { contains: s, mode: "insensitive" } },
      { action: { contains: s, mode: "insensitive" } },
      { actorUser: { email: { contains: s, mode: "insensitive" } } },
      { actorUser: { name: { contains: s, mode: "insensitive" } } },
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
