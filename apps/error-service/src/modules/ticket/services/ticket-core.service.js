import createError from "http-errors";
import prisma from "../../../config/prisma.js";
import * as ticketRepo from "../ticket.repository.js";
import { ticketEvents } from "../ticket.events.js";
import { recordLog } from "../../audit-log/audit-log.service.js";
import { formatTicket, capitalizeStatus, generateTicketId } from "./ticket-format.service.js";
import { checkUpdateTicketPermission } from "./ticket-permission.service.js";

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

  const ticketId = await generateTicketId();

  const ticketData = {
    id: ticketId,
    asset_id: asset.id,
    failure_code_id: failureCode.id,
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
    },
  });

  // Broadcast realtime SSE event
  ticketEvents.notifyTicketCreated(formatted);

  return formatted;
};
