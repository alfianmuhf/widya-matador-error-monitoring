import createError from "http-errors";
import prisma from "../../../config/prisma.js";
import * as ticketRepo from "../ticket.repository.js";
import { ticketEvents } from "../ticket.events.js";
import { recordLog } from "../../audit-log/audit-log.service.js";
import { publish as publishWebhook } from "../../webhook/webhook.publisher.js";
import { formatTicket } from "./ticket-format.service.js";
import { checkManageTicketTeamsPermission } from "../../ticket-management/ticket-permission.service.js";

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
 * Get all teams and members assigned to a ticket
 */
export const getTicketTeams = async (ticketId) => {
  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  const formatted = formatTicket(ticket);
  return {
    ticketId,
    currentTeamId: formatted.currentTeamId,
    currentTeam: formatted.currentTeam,
    leader: formatted.leader,
    totalTeams: formatted.teams.length,
    teams: formatted.teams,
    assignees: formatted.assignees,
  };
};

/**
 * Backward compatibility: getTicketAssignees
 */
export const getTicketAssignees = async (ticketId) => {
  return getTicketTeams(ticketId);
};

/**
 * Helper to resolve actor's team for claiming ticket
 */
const resolveClaimTeam = async (actorUser, requestedTeamId) => {
  if (requestedTeamId) {
    const team = await prisma.teams.findUnique({
      where: { id: requestedTeamId },
      include: { leader: true, members: true },
    });
    if (!team) throw createError(404, "Tim RnD yang dipilih tidak ditemukan");
    if (!team.is_active) throw createError(400, "Tim yang dipilih sedang tidak aktif");

    const isLeader = team.leader_user_id === actorUser.id;
    const isMember = team.members.some((m) => m.user_id === actorUser.id);
    if (!isLeader && !isMember && actorUser.role !== "admin") {
      throw createError(403, "Anda bukan anggota atau leader dari tim yang dipilih");
    }
    return team;
  }

  // Find team where actor is leader
  const ledTeams = await prisma.teams.findMany({
    where: { leader_user_id: actorUser.id, is_active: true },
    include: { leader: true, members: true },
  });

  if (ledTeams.length === 1) return ledTeams[0];
  if (ledTeams.length > 1) {
    throw createError(400, "Anda memimpin lebih dari satu tim RnD. Silakan tentukan 'teamId' yang akan menangani tiket ini.");
  }

  // Find team where actor is member
  const memberTeams = await prisma.teams.findMany({
    where: {
      is_active: true,
      members: { some: { user_id: actorUser.id } },
    },
    include: { leader: true, members: true },
  });

  if (memberTeams.length === 1) return memberTeams[0];
  if (memberTeams.length > 1) {
    throw createError(400, "Anda terdaftar di beberapa tim RnD. Silakan tentukan 'teamId' yang akan menangani tiket ini.");
  }

  throw createError(403, "Anda belum terdaftar dalam tim RnD manapun. Silakan minta Leader tim atau Admin untuk mendaftarkan Anda ke tim.");
};

/**
 * Claim ticket (assigns RnD Team to ticket and escalates status)
 */
export const claimTicket = async (ticketId, actor, data = {}) => {
  if (!actor) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  let actorUser = null;
  if (actor.id) {
    actorUser = await prisma.users.findUnique({ where: { id: actor.id } });
  }

  let actorTelegram = null;
  if (actor.telegram_user_id || actor.telegramUserId || actor.telegramId || actor.telegramUsername || actor.username) {
    const rawTeleId = actor.telegramId ? String(actor.telegramId).trim() : null;
    const rawUsername = actor.telegramUsername || actor.username ? String(actor.telegramUsername || actor.username).replace(/^@/, "").trim() : null;

    actorTelegram = await prisma.telegram_users.findFirst({
      where: {
        OR: [
          ...(actor.telegram_user_id ? [{ id: actor.telegram_user_id }] : []),
          ...(actor.telegramUserId ? [{ id: actor.telegramUserId }] : []),
          ...(rawTeleId ? [{ telegram_id: rawTeleId }] : []),
          ...(rawUsername ? [{ username: rawUsername }] : []),
        ],
      },
    });
  }

  const role = (actorUser?.role || actor.role || "").toLowerCase();
  const division = (actorUser?.division || actorTelegram?.division || actor.division || "").toLowerCase();

  if (role === "admin" || role === "viewer") {
    throw createError(403, "Akses ditolak: Admin dan Viewer tidak memiliki akses untuk mengklaim tiket.");
  }

  if (division !== "software" && division !== "rnd") {
    throw createError(403, "Fitur claim tiket ditujukan khusus untuk anggota tim RnD.");
  }

  const currentHistory =
    (ticket.ticket_history || []).find((h) => h.version === ticket.current_version) ||
    ticket.ticket_history?.[0] ||
    {};
  const currentStatus = (currentHistory.status || "open").toLowerCase();

  if (currentStatus !== "escalated") {
    throw createError(
      400,
      `Akses ditolak: Tim RnD hanya dapat mengklaim tiket ketika status tiket adalah 'escalated' (status saat ini: '${currentStatus}').`
    );
  }

  const targetTeam = await resolveClaimTeam(actorUser, data.teamId);

  // If already claimed
  if (ticket.current_team_id) {
    if (ticket.current_team_id === targetTeam.id) {
      return formatTicket(ticket);
    }

    const existingTeamName = ticket.current_team?.name || "tim lain";
    throw createError(
      409,
      `Tiket ini sudah ditangani oleh '${existingTeamName}'. Gunakan fitur pengalihan/handover oleh Leader '${existingTeamName}' untuk memindahkan tiket ke tim Anda.`
    );
  }

  // Set current team and add to ticket_teams
  await prisma.$transaction(async (tx) => {
    await tx.ticket_teams.upsert({
      where: { ticket_id_team_id: { ticket_id: ticketId, team_id: targetTeam.id } },
      update: {},
      create: { ticket_id: ticketId, team_id: targetTeam.id },
    });

    await tx.tickets.update({
      where: { id: ticketId },
      data: { current_team_id: targetTeam.id },
    });
  });

  const nextVersion = (ticket.current_version ?? 0) + 1;
  const actorName = actorUser?.name || actorUser?.email || actorTelegram?.username || "RnD Team";
  const leaderName = targetTeam.leader?.name || actorName;

  const historyData = {
    status: "escalated",
    team_id: targetTeam.id,
    damage_description: currentHistory.damage_description,
    action_taken: currentHistory.action_taken || `Tiket diklaim oleh ${targetTeam.name} (Leader: ${leaderName})`,
    root_cause: currentHistory.root_cause,
    severity: currentHistory.severity,
    notes: `Tiket diklaim oleh ${actorName} untuk ditangani oleh ${targetTeam.name}`,
    changed_by_user_id: actorUser?.id || null,
    changed_by_telegram_user_id: actorTelegram?.id || null,
  };

  const updatedRaw = await ticketRepo.updateWithHistory(ticketId, nextVersion, historyData);
  const formatted = formatTicket(updatedRaw);

  await recordLog({
    actor: actorName,
    actorUserId: actorUser?.id || null,
    actorTelegramId: actorTelegram?.id || null,
    action: "claim",
    deleteAction: "NONE",
    entityType: "Ticket",
    entityId: ticketId,
    details: {
      identifier: ticketId,
      changeSummary: `tiket diklaim oleh tim '${targetTeam.name}' (Leader: ${leaderName})`,
      teamId: targetTeam.id,
      status: "escalated",
    },
  });

  ticketEvents.notifyTicketUpdated(formatted);

  const group = await resolveEscalatedGroup(ticket);
  publishWebhook("ticket.escalated", {
    actor: { userId: actorUser?.id || null, telegramId: actorTelegram?.telegram_id || null, name: actorName },
    data: {
      ticketId,
      escalatedBy: actorName,
      team: { id: targetTeam.id, name: targetTeam.name, leader: leaderName },
      group,
    },
  });

  return formatted;
};

/**
 * Add a collaborating team to ticket_teams
 * RULE: Hanya Leader dari tim penanggung jawab saat ini (atau Admin) yang dapat mengelola tim tiket
 */
export const addTeamToTicket = async (ticketId, data, actor) => {
  await checkManageTicketTeamsPermission(ticketId, actor);

  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  let teamId = data.teamId;

  // Backward compatibility: if data has userId, username, or email instead of teamId
  if (!teamId && (data.userId || data.username || data.email)) {
    let targetUser = null;
    if (data.userId) {
      targetUser = await prisma.users.findUnique({ where: { id: data.userId } });
    } else if (data.username || data.email) {
      const uName = (data.username || data.email).toLowerCase().trim();
      targetUser = await prisma.users.findUnique({ where: { username: uName } });
    }
    if (targetUser) {
      const userTeams = await prisma.teams.findMany({
        where: {
          is_active: true,
          OR: [
            { leader_user_id: targetUser.id },
            { members: { some: { user_id: targetUser.id } } },
          ],
        },
      });
      if (userTeams.length > 0) {
        teamId = userTeams[0].id;
      }
    }
  }

  if (!teamId) {
    throw createError(400, "ID Tim ('teamId') wajib disertakan untuk menambahkan tim ke tiket");
  }

  const team = await prisma.teams.findUnique({
    where: { id: teamId },
    include: { leader: true },
  });

  if (!team) {
    throw createError(404, "Tim yang akan ditambahkan tidak ditemukan");
  }

  if (!team.is_active) {
    throw createError(400, `Tim '${team.name}' sedang tidak aktif`);
  }

  // Check if team already assigned
  const alreadyAssigned = (ticket.ticket_teams || []).some((tt) => tt.team_id === teamId);
  if (alreadyAssigned) {
    throw createError(409, `Tim '${team.name}' sudah terdaftar dalam penugasan tiket ini`);
  }

  await ticketRepo.addTeamToTicket(ticketId, teamId);

  let effectiveCurrentTeamId = ticket.current_team_id;
  if (!effectiveCurrentTeamId) {
    await prisma.tickets.update({
      where: { id: ticketId },
      data: { current_team_id: teamId },
    });
    effectiveCurrentTeamId = teamId;
  }

  const currentHistory =
    (ticket.ticket_history || []).find((h) => h.version === ticket.current_version) ||
    ticket.ticket_history?.[0] ||
    {};

  const nextVersion = (ticket.current_version ?? 0) + 1;
  const actorName = actor.name || actor.email || "Leader";

  const historyData = {
    status: currentHistory.status || "escalated",
    team_id: effectiveCurrentTeamId,
    damage_description: currentHistory.damage_description,
    action_taken: currentHistory.action_taken,
    root_cause: currentHistory.root_cause,
    severity: currentHistory.severity,
    notes: `Tim '${team.name}' ditambahkan ke tiket oleh ${actorName}`,
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
    entityType: "TicketTeam",
    entityId: teamId,
    details: {
      identifier: ticketId,
      changeSummary: `menambahkan tim '${team.name}' ke tiket ${ticketId}`,
      teamId,
      teamName: team.name,
    },
  });

  ticketEvents.notifyTicketUpdated(formatted);

  publishWebhook("ticket.member_added", {
    actor: { userId: actor.id || null, name: actorName },
    data: {
      ticketId,
      addedBy: actorName,
      team: { id: team.id, name: team.name, leader: team.leader?.name },
    },
  });

  return {
    message: `Tim '${team.name}' berhasil ditambahkan ke tiket`,
    ticket: formatted,
  };
};

/**
 * Remove a collaborating team from ticket_teams
 * RULE: Hanya Leader dari tim penanggung jawab saat ini (atau Admin) yang dapat mengelola tim tiket
 */
export const removeTeamFromTicket = async (ticketId, teamId, actor) => {
  await checkManageTicketTeamsPermission(ticketId, actor);

  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  let resolvedTeamId = teamId;
  let team = await prisma.teams.findUnique({ where: { id: resolvedTeamId } });

  if (!team) {
    const tt = await prisma.ticket_teams.findUnique({
      where: { id: teamId },
      include: { team: true },
    });
    if (tt?.team) {
      resolvedTeamId = tt.team_id;
      team = tt.team;
    }
  }

  if (!team) {
    throw createError(404, "Tim kolaborasi yang akan dihapus tidak ditemukan");
  }

  if (ticket.current_team_id === resolvedTeamId) {
    throw createError(
      400,
      "Tim penanggung jawab utama tidak dapat dihapus dari tiket. Gunakan fitur pengalihan/handover tanggung jawab ke tim lain."
    );
  }

  const teamName = team?.name || resolvedTeamId;

  await ticketRepo.removeTeamFromTicket(ticketId, resolvedTeamId);

  const currentHistory =
    (ticket.ticket_history || []).find((h) => h.version === ticket.current_version) ||
    ticket.ticket_history?.[0] ||
    {};

  const nextVersion = (ticket.current_version ?? 0) + 1;
  const actorName = actor.name || actor.email || "Leader";

  const historyData = {
    status: currentHistory.status || "escalated",
    team_id: ticket.current_team_id,
    damage_description: currentHistory.damage_description,
    action_taken: currentHistory.action_taken,
    root_cause: currentHistory.root_cause,
    severity: currentHistory.severity,
    notes: `Tim '${teamName}' dikeluarkan dari tiket oleh ${actorName}`,
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
    entityType: "TicketTeam",
    entityId: teamId,
    details: {
      identifier: ticketId,
      changeSummary: `mengeluarkan tim '${teamName}' dari tiket ${ticketId}`,
      teamId,
      teamName,
    },
  });

  ticketEvents.notifyTicketUpdated(formatted);

  return {
    message: `Tim '${teamName}' berhasil dikeluarkan dari tiket`,
    ticket: formatted,
  };
};

/**
 * Handover / transfer primary team responsibility to another team
 * RULE: Leader tim penanggung jawab aktif (atau Admin) dapat melempar tanggung jawab ke divisi/tim lain
 */
export const handoverTicketTeam = async (ticketId, data, actor) => {
  await checkManageTicketTeamsPermission(ticketId, actor);

  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  let targetTeamId = data.teamId;
  if (!targetTeamId) {
    throw createError(400, "ID Tim tujuan ('teamId') wajib disertakan");
  }

  let targetTeam = await prisma.teams.findUnique({
    where: { id: targetTeamId },
    include: { leader: true },
  });

  if (!targetTeam) {
    const tt = await prisma.ticket_teams.findUnique({
      where: { id: targetTeamId },
      include: { team: { include: { leader: true } } },
    });
    if (tt?.team) {
      targetTeamId = tt.team_id;
      targetTeam = tt.team;
    }
  }

  if (!targetTeam) {
    throw createError(404, "Tim tujuan tidak ditemukan");
  }

  if (targetTeamId === ticket.current_team_id) {
    return formatTicket(ticket);
  }

  if (!targetTeam.is_active) {
    throw createError(400, `Tim tujuan '${targetTeam.name}' sedang tidak aktif`);
  }

  const oldTeamId = ticket.current_team_id;
  const oldTeamName = ticket.current_team?.name || "Tim Sebelumnya";
  const newTeamName = targetTeam.name;
  const actorName = actor.name || actor.email || "Leader";
  const removeOldTeam = Boolean(data.removeOldTeam);

  // Update current team and ensure target team is in ticket_teams
  await ticketRepo.setTicketCurrentTeam(ticketId, targetTeamId);

  // If removeOldTeam is requested (instant handover & release old team from ticket)
  if (removeOldTeam && oldTeamId && oldTeamId !== targetTeamId) {
    await prisma.ticket_teams.deleteMany({
      where: {
        ticket_id: ticketId,
        team_id: oldTeamId,
      },
    });
  }

  const currentHistory =
    (ticket.ticket_history || []).find((h) => h.version === ticket.current_version) ||
    ticket.ticket_history?.[0] ||
    {};

  const nextVersion = (ticket.current_version ?? 0) + 1;
  const baseNote = removeOldTeam
    ? `Tanggung jawab dialihkan langsung ke ${newTeamName} dan ${oldTeamName} keluar dari tiket`
    : `Tanggung jawab dialihkan dari ${oldTeamName} ke ${newTeamName}`;
  const handoverNote = data.notes
    ? `${baseNote} (${data.notes})`
    : `${baseNote} oleh ${actorName}`;

  const historyData = {
    status: "escalated",
    team_id: targetTeamId,
    damage_description: currentHistory.damage_description,
    action_taken: currentHistory.action_taken,
    root_cause: currentHistory.root_cause,
    severity: currentHistory.severity,
    notes: handoverNote,
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
    entityType: "TicketHandover",
    entityId: ticketId,
    details: {
      identifier: ticketId,
      changeSummary: `mengalihkan tanggung jawab tiket dari '${oldTeamName}' ke '${newTeamName}'`,
      ticketId,
      oldTeam: oldTeamName,
      newTeam: newTeamName,
      reason: data.notes || null,
    },
  });

  ticketEvents.notifyTicketUpdated(formatted);

  publishWebhook("ticket.leader_changed", {
    actor: { userId: actor.id || null, name: actorName },
    data: {
      ticketId,
      oldTeam: oldTeamName,
      newTeam: { id: targetTeam.id, name: targetTeam.name, leader: targetTeam.leader?.name },
      changedBy: actorName,
      changeType: "handover",
    },
  });

  return formatted;
};

// Backward-compatible alias exports
export const addAssignee = async (ticketId, data, actor) => {
  return addTeamToTicket(ticketId, data, actor);
};

export const updateAssignee = async (ticketId, assigneeId, data, actor) => {
  return handoverTicketTeam(ticketId, data, actor);
};

export const changeLeader = async (ticketId, data, actor) => {
  return handoverTicketTeam(ticketId, data, actor);
};

export const removeAssignee = async (ticketId, assigneeId, actor) => {
  return removeTeamFromTicket(ticketId, assigneeId, actor);
};
