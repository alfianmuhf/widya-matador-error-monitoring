import createError from "http-errors";
import * as ticketRepo from "./ticket.repository.js";
import { ticketEvents } from "./ticket.events.js";
import prisma from "../../config/prisma.js";
import { recordLog } from "../audit-log/audit-log.service.js";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

/**
 * Format date to 'DD Mon YYYY' in WIB (UTC+7)
 */
export const formatDateWIB = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  // Shift to UTC+7
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);

  const day = String(wib.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[wib.getMonth()];
  const year = wib.getFullYear();
  return `${day} ${month} ${year}`;
};

/**
 * Format date to 'DD Mon YYYY, HH:mm' in WIB (UTC+7)
 */
export const formatDateTimeWIB = (date) => {
  if (!date) return "-";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "-";

  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);

  const day = String(wib.getDate()).padStart(2, "0");
  const month = MONTH_NAMES[wib.getMonth()];
  const year = wib.getFullYear();
  const hours = String(wib.getHours()).padStart(2, "0");
  const minutes = String(wib.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};

/**
 * Compute friendly duration text (MTTR)
 */
export const computeDurationText = (createdAt, resolvedAt) => {
  if (!createdAt) return "—";
  const start = new Date(createdAt).getTime();
  const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);

  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return "< 1 menit";
  if (minutes < 60) return `${minutes} menit`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0 ? `${hours} jam ${remainingMinutes} menit` : `${hours} jam`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days} hari ${remainingHours} jam` : `${days} hari`;
};

/**
 * Capitalize status string (e.g. open -> Open, escalated -> Escalated)
 */
export const capitalizeStatus = (status) => {
  if (!status) return "Open";
  const s = status.toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Format Prisma Ticket model into a frontend-friendly object matching apps/interfaces
 */
export const formatTicket = (t) => {
  if (!t) return null;

  const displayStatus = capitalizeStatus(t.status);
  const rawStatus = t.status || "open";

  // Determine reporter name
  let reporter = "-";
  if (t.reporterTelegram) {
    reporter = t.reporterTelegram.username
      ? `@${t.reporterTelegram.username}`
      : t.reporterTelegram.fullName || t.reporterTelegram.telegramId;
  } else if (t.reporterUser) {
    reporter = t.reporterUser.name || t.reporterUser.email;
  }

  // Format history array
  const formattedHistory = (t.history || []).map((h) => {
    let author = "Sistem";
    if (h.changedByUser) {
      author = h.changedByUser.name || h.changedByUser.email;
    } else if (h.changedByTelegram) {
      author = h.changedByTelegram.username
        ? `@${h.changedByTelegram.username}`
        : h.changedByTelegram.fullName || "Telegram User";
    }

    let action = h.notes || "Perubahan tiket";
    const oldStatus = h.oldValue?.status;
    const newStatus = h.newValue?.status;
    if (oldStatus && newStatus && oldStatus !== newStatus) {
      action = `Status diubah ke ${capitalizeStatus(newStatus)}${h.notes ? `: "${h.notes}"` : ""}`;
    }

    return {
      id: h.id,
      action,
      notes: h.notes || null,
      timestamp: formatDateTimeWIB(h.changedAt),
      author,
      type: "update",
      changedAt: h.changedAt,
      oldValue: h.oldValue,
      newValue: h.newValue,
    };
  });

  return {
    id: t.ticketId,
    ticketId: t.ticketId,
    unit: t.unitCode,
    unitCode: t.unitCode,
    unitType: t.asset?.type ? t.asset.type.toLowerCase() : "portable",
    client: t.asset?.client?.name || "-",
    clientId: t.asset?.client?.id || null,
    location: t.asset?.location?.name || "-",
    locationId: t.asset?.location?.id || null,
    component: t.component?.name || "-",
    componentId: t.componentId,
    failureCode: t.failureCode?.code || "-",
    failureCodeId: t.failureCodeId,
    failureName: t.failureCode?.description || "",
    severity: t.severity || "Rendah",
    status: displayStatus,
    rawStatus: rawStatus,
    createdAt: t.createdAt,
    createdDateText: formatDateWIB(t.createdAt),
    createdDateTimeText: formatDateTimeWIB(t.createdAt),
    durationText: computeDurationText(t.createdAt, t.resolvedAt),
    source: t.source || "dashboard",
    reporter,
    reporterUserId: t.reporterUserId,
    reporterTelegramId: t.reporterTelegramId,
    description: t.damageDescription || "-",
    damageDescription: t.damageDescription || null,
    handling: t.actionTaken || "Belum ada penanganan",
    actionTaken: t.actionTaken || null,
    cause: t.rootCause || "-",
    rootCause: t.rootCause || null,
    resolvedAt: t.resolvedAt,
    closedAt: t.closedAt,
    history: formattedHistory,
    attachments: t.attachments || [],
  };
};

/**
 * Generate sequential ticket ID for today: ERR-YYYYMMDD-NNNN
 */
export const generateTicketId = async () => {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);

  const yyyy = wib.getFullYear();
  const mm = String(wib.getMonth() + 1).padStart(2, "0");
  const dd = String(wib.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `ERR-${dateStr}-`;

  const latest = await ticketRepo.findLatestByDatePrefix(prefix);
  let nextSeq = 1;
  if (latest && latest.ticketId) {
    const parts = latest.ticketId.split("-");
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  const seqStr = String(nextSeq).padStart(4, "0");
  return `${prefix}${seqStr}`;
};

/**
 * Get tickets list with filtering, searching, and pagination
 */
export const getTickets = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(1000, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const where = {};

  // Status filter
  if (query.status) {
    where.status = query.status.toLowerCase();
  }

  // Severity filter
  if (query.severity) {
    where.severity = query.severity;
  }

  // Component filter
  if (query.componentId) {
    where.componentId = query.componentId;
  }

  // Unit filter
  if (query.unitCode) {
    where.unitCode = { contains: query.unitCode, mode: "insensitive" };
  }

  // Client & Location filter (via Asset)
  if (query.clientId || query.locationId) {
    where.asset = {
      ...(query.clientId ? { clientId: query.clientId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
    };
  }

  // Date range filter
  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) where.createdAt.gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      // If date string without time, include whole day
      if (query.endDate.length === 10) {
        end.setHours(23, 59, 59, 999);
      }
      where.createdAt.lte = end;
    }
  }

  // Search keyword (matches ticketId, unitCode, damageDescription, actionTaken, component name, failure code)
  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { ticketId: { contains: s, mode: "insensitive" } },
      { unitCode: { contains: s, mode: "insensitive" } },
      { damageDescription: { contains: s, mode: "insensitive" } },
      { actionTaken: { contains: s, mode: "insensitive" } },
      { rootCause: { contains: s, mode: "insensitive" } },
      { component: { name: { contains: s, mode: "insensitive" } } },
      { failureCode: { code: { contains: s, mode: "insensitive" } } },
      { asset: { client: { name: { contains: s, mode: "insensitive" } } } },
      { asset: { location: { name: { contains: s, mode: "insensitive" } } } },
    ];
  }

  // Order By
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";
  const orderBy = { [sortBy]: sortOrder };

  const [rawTickets, total] = await Promise.all([
    ticketRepo.findMany({ skip, take: limit, where, orderBy }),
    ticketRepo.count(where),
  ]);

  const tickets = rawTickets.map(formatTicket);

  return {
    tickets,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get ticket detail by ticketId
 */
export const getTicketById = async (ticketId) => {
  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }
  return formatTicket(ticket);
};

/**
 * Update ticket status and/or handling note / comment
 */
export const updateTicket = async (ticketId, data, actor = {}) => {
  const currentTicket = await ticketRepo.findById(ticketId);
  if (!currentTicket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  const updateData = {};
  const oldValues = {};
  const newValues = {};

  // Status update
  let targetStatus = currentTicket.status;
  if (data.status) {
    targetStatus = data.status.toLowerCase();
    if (targetStatus !== currentTicket.status) {
      updateData.status = targetStatus;
      oldValues.status = currentTicket.status;
      newValues.status = targetStatus;

      // Handle lifecycle timestamps
      if (targetStatus === "solved" && !currentTicket.resolvedAt) {
        updateData.resolvedAt = new Date();
      } else if (targetStatus === "closed" && !currentTicket.closedAt) {
        updateData.closedAt = new Date();
      } else if (targetStatus === "open" || targetStatus === "escalated") {
        updateData.resolvedAt = null;
        updateData.closedAt = null;
      }
    }
  }

  // Note / Comment update
  const handlingNote = data.handlingNote || data.comment || data.notes;
  if (handlingNote !== undefined && handlingNote !== "") {
    updateData.actionTaken = handlingNote;
    oldValues.actionTaken = currentTicket.actionTaken;
    newValues.actionTaken = handlingNote;
  }

  // Other fields update
  if (data.damageDescription !== undefined) updateData.damageDescription = data.damageDescription;
  if (data.actionTaken !== undefined) updateData.actionTaken = data.actionTaken;
  if (data.rootCause !== undefined) updateData.rootCause = data.rootCause;
  if (data.severity !== undefined) updateData.severity = data.severity;

  // History record
  const historyData = {
    changedByUserId: actor.id || null,
    oldValue: Object.keys(oldValues).length > 0 ? oldValues : null,
    newValue: Object.keys(newValues).length > 0 ? newValues : null,
    notes: handlingNote || (data.status ? `Status diubah ke ${capitalizeStatus(targetStatus)}` : "Pembaruan tiket"),
  };

  const updatedRaw = await ticketRepo.updateWithHistory(ticketId, updateData, historyData);
  const formatted = formatTicket(updatedRaw);

  // Record audit log entry (deleteAction is strictly NONE for UPDATE/STATUS_CHANGE)
  const isStatus = Boolean(data.status && data.status.toLowerCase() !== currentTicket.status.toLowerCase());
  const auditAction = isStatus ? "status_change" : "update";
  const changeSummary = isStatus
    ? `${currentTicket.status} → ${targetStatus}`
    : Object.entries(newValues).map(([k, v]) => `${k}: ${oldValues[k]} → ${v}`).join(", ");

  await recordLog({
    actor: actor.email || actor.name || "Sistem",
    actorUserId: actor.id || null,
    action: auditAction,
    deleteAction: "NONE",
    entityType: "Ticket",
    entityId: ticketId,
    details: {
      identifier: ticketId,
      changeSummary: changeSummary || historyData.notes,
      notes: historyData.notes,
      changes: newValues,
    },
  });

  // Broadcast realtime SSE event
  ticketEvents.notifyTicketUpdated(formatted);

  return formatted;
};

/**
 * Add a comment / note to ticket history
 */
export const addComment = async (ticketId, { notes }, actor = {}) => {
  const currentTicket = await ticketRepo.findById(ticketId);
  if (!currentTicket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  // Also update actionTaken on ticket
  const updateData = { actionTaken: notes };
  const historyData = {
    changedByUserId: actor.id || null,
    oldValue: { actionTaken: currentTicket.actionTaken },
    newValue: { actionTaken: notes },
    notes,
  };

  const updatedRaw = await ticketRepo.updateWithHistory(ticketId, updateData, historyData);
  const formatted = formatTicket(updatedRaw);

  // Record audit log entry (deleteAction is strictly NONE for UPDATE)
  await recordLog({
    actor: actor.email || actor.name || "Sistem",
    actorUserId: actor.id || null,
    action: "update",
    deleteAction: "NONE",
    entityType: "Ticket",
    entityId: ticketId,
    details: {
      identifier: ticketId,
      changeSummary: `catatan: "${notes.length > 40 ? notes.slice(0, 40) + '...' : notes}"`,
      notes,
    },
  });

  // Broadcast realtime SSE event
  ticketEvents.notifyTicketComment(ticketId, notes);
  ticketEvents.notifyTicketUpdated(formatted);

  return formatted;
};

/**
 * Create a new ticket (from dashboard or API)
 */
export const createTicket = async (data, actor = {}) => {
  // 1. Verify Asset exists
  const asset = await prisma.asset.findUnique({
    where: { unitCode: data.unitCode },
  });
  if (!asset) {
    throw createError(404, `Asset unit '${data.unitCode}' tidak ditemukan`);
  }

  // 2. Verify Component exists
  const component = await prisma.component.findUnique({
    where: { id: data.componentId },
  });
  if (!component) {
    throw createError(404, "Komponen tidak ditemukan");
  }

  // 3. Verify FailureCode exists
  const failureCode = await prisma.failureCode.findUnique({
    where: { id: data.failureCodeId },
  });
  if (!failureCode) {
    throw createError(404, "Failure code tidak ditemukan");
  }

  const ticketId = await generateTicketId();

  const ticketData = {
    ticketId,
    unitCode: data.unitCode,
    componentId: data.componentId,
    failureCodeId: data.failureCodeId,
    damageDescription: data.damageDescription || null,
    actionTaken: data.actionTaken || null,
    rootCause: data.rootCause || null,
    severity: data.severity || "Rendah",
    status: data.status || "open",
    source: "dashboard",
    reporterUserId: actor.id || null,
  };

  const historyData = {
    changedByUserId: actor.id || null,
    oldValue: null,
    newValue: {
      status: ticketData.status,
      unitCode: ticketData.unitCode,
      actionTaken: ticketData.actionTaken,
    },
    notes: "Tiket dibuat via Dashboard",
  };

  const createdRaw = await ticketRepo.createWithHistory(ticketData, historyData);
  const formatted = formatTicket(createdRaw);

  // Record audit log entry (deleteAction is strictly NONE for CREATE)
  await recordLog({
    actor: actor.email || actor.name || "Sistem",
    actorUserId: actor.id || null,
    action: "create",
    deleteAction: "NONE",
    entityType: "Ticket",
    entityId: ticketId,
    details: {
      identifier: ticketId,
      changeSummary: `tambah tiket baru (${ticketData.unitCode})`,
      unitCode: ticketData.unitCode,
      severity: ticketData.severity,
      status: ticketData.status,
    },
  });


  // Broadcast realtime SSE event
  ticketEvents.notifyTicketCreated(formatted);

  return formatted;
};

