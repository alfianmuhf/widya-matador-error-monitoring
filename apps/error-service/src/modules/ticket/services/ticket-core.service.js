import createError from "http-errors";
import prisma from "../../../config/prisma.js";
import * as ticketRepo from "../ticket.repository.js";
import { ticketEvents } from "../ticket.events.js";
import { recordLog } from "../../audit-log/audit-log.service.js";
import { formatTicket, capitalizeStatus, generateTicketId } from "./ticket-format.service.js";
import { checkUpdateTicketPermission } from "../../ticket-management/ticket-permission.service.js";
import { publish as publishWebhook } from "../../webhook/webhook.publisher.js";

/**
 * Resolve grup Telegram untuk notifikasi escalated.
 * Prioritas: grup client+location → location → client → null (fallback n8n).
 */
const resolveEscalatedGroup = async (ticket) => {
  const clientId = ticket.asset?.client_id || ticket.asset?.client?.id || null;
  const locationId = ticket.asset?.location_id || ticket.asset?.location?.id || null;

  const findGroup = async (where) => {
    const g = await prisma.telegram_groups.findFirst({ where: { is_active: true, ...where } });
    return g?.chat_id || null;
  };

  let chatId = null;
  if (clientId && locationId) chatId = await findGroup({ client_id: clientId, location_id: locationId });
  if (!chatId && locationId) chatId = await findGroup({ location_id: locationId, client_id: null });
  if (!chatId && clientId) chatId = await findGroup({ client_id: clientId, location_id: null });

  return { chatId, clientId, locationId };
};

/**
 * Get tickets list with filtering, searching, and pagination
 */
export const getTickets = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.max(1, Math.min(10000, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const where = {};

  // Status and Severity filter (derived from latest history version = current_version)
  const statusFilter = query.status ? query.status.toLowerCase() : null;
  const severityFilter = query.severity ? query.severity.toLowerCase() : null;

  if (statusFilter || severityFilter) {
    const matchingIds = await ticketRepo.findTicketIdsByCurrentHistory({
      status: statusFilter,
      severity: severityFilter,
    });
    if (matchingIds) {
      where.id = { in: matchingIds };
    }
  }

  // Component filter (via failure_code)
  if (query.componentId) {
    where.failure_code = {
      component_id: query.componentId,
    };
  }

  // Unit filter
  if (query.unitCode) {
    where.asset = {
      ...where.asset,
      unit_code: { contains: query.unitCode, mode: "insensitive" },
    };
  }

  // Client & Location filter (via Asset)
  if (query.clientId || query.locationId) {
    where.asset = {
      ...where.asset,
      ...(query.clientId ? { client_id: query.clientId } : {}),
      ...(query.locationId ? { location_id: query.locationId } : {}),
    };
  }

  // Date range filter
  if (query.startDate || query.endDate) {
    where.created_at = {};
    if (query.startDate) where.created_at.gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      if (query.endDate.length === 10) {
        end.setHours(23, 59, 59, 999);
      }
      where.created_at.lte = end;
    }
  }

  // Search keyword (matches ticketId, unit_code, damage_description, action_taken, component name, failure code)
  if (query.search) {
    const s = query.search.trim();
    where.OR = [
      { id: { contains: s, mode: "insensitive" } },
      { asset: { unit_code: { contains: s, mode: "insensitive" } } },
      { asset: { client: { name: { contains: s, mode: "insensitive" } } } },
      { asset: { location: { name: { contains: s, mode: "insensitive" } } } },
      { failure_code: { code: { contains: s, mode: "insensitive" } } },
      { failure_code: { component: { name: { contains: s, mode: "insensitive" } } } },
      { ticket_history: { some: { damage_description: { contains: s, mode: "insensitive" } } } },
      { ticket_history: { some: { action_taken: { contains: s, mode: "insensitive" } } } },
      { ticket_history: { some: { root_cause: { contains: s, mode: "insensitive" } } } },
    ];
  }

  // Order By
  const sortByMap = {
    createdAt: "created_at",
    created_at: "created_at",
    ticketId: "id",
    id: "id",
  };
  const sortBy = sortByMap[query.sortBy] || "created_at";
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
 * Get ticket detail by ID
 */
export const getTicketById = async (ticketId) => {
  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }
  return formatTicket(ticket);
};

/**
 * Update ticket status and/or handling note / fields
 * Increments current_version (1, 2, 3...) and writes a new row to ticket_history.
 * Enforces permission checks (Software team must be in assignees & status escalated).
 */
export const updateTicket = async (ticketId, data, actor = {}) => {
  const currentTicket = await ticketRepo.findById(ticketId);
  if (!currentTicket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  // Check authorization (Aftersales freely allowed, Software team strictly requires status 'escalated' and assignment)
  await checkUpdateTicketPermission(ticketId, actor, currentTicket);

  // Find latest state
  const currentHistory =
    (currentTicket.ticket_history || []).find((h) => h.version === currentTicket.current_version) ||
    currentTicket.ticket_history?.[0] ||
    {};

  const nextVersion = (currentTicket.current_version ?? 0) + 1;

  const targetStatus = data.status ? data.status.toLowerCase() : currentHistory.status || "open";
  const handlingNote = data.handlingNote || data.notes || data.comment;

  const historyData = {
    status: targetStatus,
    damage_description: data.damageDescription !== undefined ? data.damageDescription : currentHistory.damage_description,
    action_taken: data.actionTaken !== undefined ? data.actionTaken : (handlingNote || currentHistory.action_taken),
    root_cause: data.rootCause !== undefined ? data.rootCause : currentHistory.root_cause,
    severity: data.severity ? data.severity.toLowerCase() : currentHistory.severity || "rendah",
    notes: handlingNote || (data.status ? `Status diubah ke ${capitalizeStatus(targetStatus)}` : `Pembaruan tiket v${nextVersion}`),
    changed_by_user_id: actor.id || null,
    changed_by_telegram_user_id: actor.telegram_user_id || null,
  };

  const updatedRaw = await ticketRepo.updateWithHistory(ticketId, nextVersion, historyData);
  const formatted = formatTicket(updatedRaw);

  const isStatus = Boolean(data.status && data.status.toLowerCase() !== (currentHistory.status || "").toLowerCase());
  const auditAction = isStatus ? "status_change" : "update";
  const changeSummary = isStatus
    ? `${currentHistory.status} → ${targetStatus}`
    : historyData.notes;

  await recordLog({
    actor: actor.email || actor.name || "Sistem",
    actorUserId: actor.id || null,
    action: auditAction,
    deleteAction: "NONE",
    entityType: "Ticket",
    entityId: ticketId,
    details: {
      identifier: ticketId,
      version: nextVersion,
      changeSummary,
      status: targetStatus,
      notes: historyData.notes,
    },
  });

  // Broadcast realtime SSE event
  ticketEvents.notifyTicketUpdated(formatted);

  // Publish ticket.escalated event when status changes from open to escalated
  if (isStatus && targetStatus === "escalated" && (currentHistory.status || "").toLowerCase() === "open") {
    const actorName = actor.email || actor.name || "Sistem";
    const group = await resolveEscalatedGroup(currentTicket);
    publishWebhook("ticket.escalated", {
      actor: { userId: actor.id || null, telegramId: actor.telegram_user_id || null, name: actorName },
      data: {
        ticketId,
        escalatedBy: actorName,
        group,
      },
    });
  }

  return formatted;
};

/**
 * Add a comment / note to ticket history
 */
export const addComment = async (ticketId, { notes }, actor = {}) => {
  return updateTicket(ticketId, { handlingNote: notes, notes }, actor);
};

/**
 * Create a new ticket (from dashboard or API)
 * Starts version at 0.
 */
export const createTicket = async (data, actor = {}) => {
  // Verifikasi wewenang: khusus coordinator divisi aftersales
  const actorRole = (actor.role || "").toLowerCase();
  const actorDivision = (actor.division || "").toLowerCase();
  if (actorRole !== "coordinator" || actorDivision !== "after_sales") {
    throw createError(
      403,
      "Akses ditolak: Fitur penambahan tiket baru hanya dapat dilakukan oleh Koordinator divisi Aftersales."
    );
  }

  // 1. Verify Asset exists
  const asset = await prisma.assets.findUnique({
    where: { unit_code: data.unitCode },
  });
  if (!asset) {
    throw createError(404, `Asset unit '${data.unitCode}' tidak ditemukan`);
  }

  // 2. Verify FailureCode exists
  const failureCode = await prisma.failure_codes.findUnique({
    where: { id: data.failureCodeId },
    include: { component: true },
  });
  if (!failureCode) {
    throw createError(404, "Failure code tidak ditemukan");
  }

  // Resolve aftersales_user_id (selalu gunakan ID koordinator aftersales pembuat tiket)
  const aftersalesUserId = actor.id;

  // Generate unique Ticket ID: ERR-YYYYMMDD-NNNN
  const ticketId = await generateTicketId();

  const ticketData = {
    id: ticketId,
    asset_id: asset.id,
    failure_code_id: failureCode.id,
    aftersales_user_id: aftersalesUserId,
  };

  const initialStatus = data.status ? data.status.toLowerCase() : "open";
  const initialSeverity = data.severity ? data.severity.toLowerCase() : "rendah";

  const historyData = {
    status: initialStatus,
    damage_description: data.damageDescription || null,
    action_taken: data.actionTaken || null,
    root_cause: data.rootCause || null,
    severity: initialSeverity,
    notes: data.notes || "Tiket baru dibuat",
    changed_by_user_id: actor.id || null,
    changed_by_telegram_user_id: actor.telegram_user_id || null,
  };

  const createdRaw = await ticketRepo.createWithHistory(ticketData, historyData);
  const formatted = formatTicket(createdRaw);

  await recordLog({
    actor: actor.email || actor.name || "Sistem",
    actorUserId: actor.id || null,
    action: "create",
    deleteAction: "NONE",
    entityType: "Ticket",
    entityId: ticketId,
    details: {
      identifier: ticketId,
      changeSummary: `tambah tiket baru '${ticketId}' (${asset.unit_code})`,
      unitCode: asset.unit_code,
      severity: initialSeverity,
      status: initialStatus,
      aftersalesUserId,
    },
  });

  // Broadcast realtime SSE event
  ticketEvents.notifyTicketCreated(formatted);

  return formatted;
};

/**
 * Transfer aftersales responsibility to another aftersales user
 * Allowed when ticket status is 'open'.
 * Can be executed by current aftersales owner or Admin.
 */
export const transferAftersalesLead = async (ticketId, { aftersalesUserId }, actor = {}) => {
  if (!actor) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  const currentHistory =
    (ticket.ticket_history || []).find((h) => h.version === ticket.current_version) ||
    ticket.ticket_history?.[0] ||
    {};
  const currentStatus = (currentHistory.status || "open").toLowerCase();

  // Rule: "tapi itu yang status nya masih open"
  if (currentStatus !== "open") {
    throw createError(
      403,
      `Akses ditolak: Pengalihan penanggung jawab Aftersales hanya dapat dilakukan ketika tiket berstatus 'open' (status saat ini: '${currentStatus}').`
    );
  }

  const actorRole = (actor.role || "").toLowerCase();
  const isCurrentAftersales = ticket.aftersales_user_id && ticket.aftersales_user_id === actor.id;
  const isAdmin = actorRole === "admin";

  if (!isCurrentAftersales && !isAdmin) {
    throw createError(
      403,
      "Akses ditolak: Hanya Koordinator penanggung jawab Aftersales saat ini atau Admin yang dapat mengalihkan penanggung jawab."
    );
  }

  // Validate target user
  const targetUser = await prisma.users.findUnique({
    where: { id: aftersalesUserId },
  });
  if (!targetUser) {
    throw createError(404, "User Aftersales target tidak ditemukan");
  }

  const targetDivision = (targetUser.division || "").toLowerCase();
  if (targetDivision !== "after_sales") {
    throw createError(400, "User target harus berasal dari divisi After Sales");
  }

  // Update ticket
  await ticketRepo.updateAftersalesLead(ticketId, targetUser.id);

  const oldAftersalesName = ticket.aftersales_user?.name || "Petugas Sebelumnya";
  const newAftersalesName = targetUser.name || "Petugas Baru";
  const actorName = actor.name || actor.email || "Sistem";

  // Next version history
  const nextVersion = (ticket.current_version ?? 0) + 1;
  const historyData = {
    status: "open",
    damage_description: currentHistory.damage_description,
    action_taken: currentHistory.action_taken,
    root_cause: currentHistory.root_cause,
    severity: currentHistory.severity,
    notes: `Penanggung jawab Aftersales dialihkan dari ${oldAftersalesName} ke ${newAftersalesName}`,
    changed_by_user_id: actor.id || null,
    changed_by_telegram_user_id: actor.telegram_user_id || null,
  };

  const updatedRaw = await ticketRepo.updateWithHistory(ticketId, nextVersion, historyData);
  const formatted = formatTicket(updatedRaw);

  await recordLog({
    actor: actorName,
    actorUserId: actor.id || null,
    action: "update",
    deleteAction: "NONE",
    entityType: "TicketAftersalesLead",
    entityId: ticketId,
    details: {
      identifier: ticketId,
      changeSummary: `Penanggung jawab Aftersales dialihkan ke '${newAftersalesName}'`,
      ticketId,
      oldAftersalesUserId: ticket.aftersales_user_id,
      newAftersalesUserId: targetUser.id,
    },
  });

  ticketEvents.notifyTicketUpdated(formatted);

  return formatted;
};
