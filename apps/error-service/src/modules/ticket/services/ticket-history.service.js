import createError from "http-errors";
import * as ticketRepo from "../ticket.repository.js";
import { formatDateTimeWIB, capitalizeStatus } from "./ticket-format.service.js";

/**
 * Get ticket history list by ticketId
 */
export const getTicketHistory = async (ticketId, query = {}) => {
  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  const order = query.order === "asc" ? "asc" : "desc";
  const historyList = await ticketRepo.findHistoryByTicketId(ticketId, { order });

  const formatted = historyList.map((h) => {
    let author = "Sistem";
    let authorRole = null;
    let authorDivision = null;

    if (h.changed_by_user) {
      author = h.changed_by_user.name || h.changed_by_user.email;
      authorRole = h.changed_by_user.role;
      authorDivision = h.changed_by_user.division;
    } else if (h.changed_by_telegram) {
      author = h.changed_by_telegram.username
        ? `@${h.changed_by_telegram.username}`
        : h.changed_by_telegram.full_name || h.changed_by_telegram.telegram_id;
      authorDivision = h.changed_by_telegram.division;
    }

    return {
      id: h.id,
      ticketId: h.ticket_id,
      version: h.version,
      status: capitalizeStatus(h.status),
      rawStatus: h.status,
      damageDescription: h.damage_description,
      actionTaken: h.action_taken,
      rootCause: h.root_cause,
      severity: capitalizeStatus(h.severity),
      rawSeverity: h.severity,
      notes: h.notes || null,
      timestamp: formatDateTimeWIB(h.changed_at),
      changedAt: h.changed_at,
      author,
      authorRole,
      authorDivision,
      changedByUserId: h.changed_by_user_id,
      changedByTelegramUserId: h.changed_by_telegram_user_id,
    };
  });

  return {
    ticketId,
    currentVersion: ticket.current_version,
    totalRecords: formatted.length,
    history: formatted,
  };
};

/**
 * Get specific version detail of ticket history
 */
export const getTicketHistoryDetail = async (ticketId, version) => {
  const history = await ticketRepo.findHistoryByVersion(ticketId, version);
  if (!history) {
    throw createError(404, `Riwayat tiket '${ticketId}' versi ${version} tidak ditemukan`);
  }

  let author = "Sistem";
  if (history.changed_by_user) {
    author = history.changed_by_user.name || history.changed_by_user.email;
  } else if (history.changed_by_telegram) {
    author = history.changed_by_telegram.username
      ? `@${history.changed_by_telegram.username}`
      : history.changed_by_telegram.full_name || history.changed_by_telegram.telegram_id;
  }

  return {
    id: history.id,
    ticketId: history.ticket_id,
    version: history.version,
    status: capitalizeStatus(history.status),
    rawStatus: history.status,
    damageDescription: history.damage_description,
    actionTaken: history.action_taken,
    rootCause: history.root_cause,
    severity: capitalizeStatus(history.severity),
    rawSeverity: history.severity,
    notes: history.notes,
    timestamp: formatDateTimeWIB(history.changed_at),
    changedAt: history.changed_at,
    author,
    changedByUser: history.changed_by_user,
    changedByTelegram: history.changed_by_telegram,
  };
};
