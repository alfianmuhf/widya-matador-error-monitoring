import createError from "http-errors";
import prisma from "../../../config/prisma.js";
import * as ticketRepo from "../ticket.repository.js";
import { ticketEvents } from "../ticket.events.js";
import { recordLog } from "../../audit-log/audit-log.service.js";
import { publish as publishWebhook } from "../../webhook/webhook.publisher.js";
import { formatTicket } from "./ticket-format.service.js";

/**
 * Resolve tujuan grup Telegram untuk notifikasi tiket (klaim).
 * Prioritas: grup client+location → location → client → null (fallback n8n).
 */
const resolveClaimGroup = async (ticket) => {
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
 * Get all assignees of a ticket
 */
export const getTicketAssignees = async (ticketId) => {
  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  const assignees = await ticketRepo.findAssigneesByTicketId(ticketId);
  const leaderId = ticket.leader_assignee_id;

  return {
    ticketId,
    leaderAssigneeId: leaderId,
    totalAssignees: assignees.length,
    assignees: assignees.map((a) => {
      const isLeader = a.id === leaderId;
      let name = "Unknown";
      let identifier = "-";

      if (a.user) {
        name = a.user.name;
        identifier = a.user.email;
      } else if (a.telegram_user) {
        name = a.telegram_user.full_name || a.telegram_user.username || a.telegram_user.telegram_id;
        identifier = a.telegram_user.username ? `@${a.telegram_user.username}` : a.telegram_user.telegram_id;
      }

      return {
        id: a.id,
        ticketId: a.ticket_id,
        isLeader,
        name,
        identifier,
        userId: a.user_id,
        telegramUserId: a.telegram_user_id,
        user: a.user || null,
        telegramUser: a.telegram_user || null,
        createdAt: a.created_at,
      };
    }),
  };
};

/**
 * Claim ticket (first software team member claiming becomes Leader)
 * Note: Claiming can be executed via Telegram/n8n or API.
 */
export const claimTicket = async (ticketId, actor) => {
  if (!actor) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  // Actor verification: must be software team member or admin
  let actorUser = null;
  if (actor.id) {
    actorUser = await prisma.users.findUnique({ where: { id: actor.id } });
  }

  let actorTelegram = null;
  if (actor.telegram_user_id || actor.telegramUserId || actor.telegramId || actor.telegramUsername || actor.username) {
    const rawTeleId = actor.telegramId ? String(actor.telegramId).trim() : null;
    const rawUsername = (actor.telegramUsername || actor.username ? String(actor.telegramUsername || actor.username).replace(/^@/, "").trim() : null);

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

  if (division !== "software") {
    throw createError(403, "Fitur claim tiket ditujukan khusus untuk anggota tim Software.");
  }

  // Ambil state terakhir tiket
  const currentHistory =
    (ticket.ticket_history || []).find((h) => h.version === ticket.current_version) ||
    ticket.ticket_history?.[0] ||
    {};
  const currentStatus = (currentHistory.status || "open").toLowerCase();

  // Validasi: Tim software hanya dapat mengklaim ketika tiket berstatus 'escalated'
  if (division === "software" && currentStatus !== "escalated") {
    throw createError(
      400,
      `Akses ditolak: Tim software hanya dapat mengklaim tiket ketika status tiket adalah 'escalated' (status saat ini: '${currentStatus}').`
    );
  }

  // Check if ticket already has a leader
  if (ticket.leader_assignee_id) {
    const existingLeader = await ticketRepo.findAssigneeById(ticket.leader_assignee_id);
    const isCurrentLeader =
      existingLeader &&
      ((existingLeader.user_id && existingLeader.user_id === actorUser?.id) ||
        (existingLeader.telegram_user_id && existingLeader.telegram_user_id === actorTelegram?.id));

    if (isCurrentLeader) {
      return formatTicket(ticket);
    }

    const leaderName = existingLeader?.user?.name || existingLeader?.telegram_user?.username || "orang lain";
    throw createError(
      409,
      `Tiket ini sudah diklaim oleh leader tim software (${leaderName}). Hanya leader yang dapat menambahkan anggota tim.`
    );
  }

  // Check if actor is already assigned (unlikely if no leader, but check)
  const existingAssignee = await ticketRepo.findAssigneeByTicketAndMember(ticketId, {
    userId: actorUser?.id,
    telegramUserId: actorTelegram?.id,
  });

  let assigneeRecord = existingAssignee;
  if (!assigneeRecord) {
    assigneeRecord = await ticketRepo.addAssigneeToTicket(ticketId, {
      userId: actorUser?.id,
      telegramUserId: actorTelegram?.id,
      isLeader: true,
    });
  } else {
    await ticketRepo.setTicketLeader(ticketId, assigneeRecord.id);
  }

  const nextVersion = (ticket.current_version ?? 0) + 1;
  const newStatus = "escalated";
  const actorName = actorUser?.name || actorUser?.email || actorTelegram?.username || "Software Team";

  const historyData = {
    status: newStatus,
    damage_description: currentHistory.damage_description,
    action_taken: currentHistory.action_taken || `Tiket diklaim oleh ${actorName} (Leader Software)`,
    root_cause: currentHistory.root_cause,
    severity: currentHistory.severity,
    notes: `Tiket diklaim oleh ${actorName} sebagai Leader tim Software`,
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
      changeSummary: `tiket diklaim oleh leader tim software '${actorName}'`,
      leaderAssigneeId: assigneeRecord.id,
      status: newStatus,
    },
  });

  ticketEvents.notifyTicketUpdated(formatted);

  // Notifikasi grup: "tiket diklaim oleh X" (grup = client/location tiket)
  const group = await resolveClaimGroup(ticket);
  publishWebhook("ticket.claimed", {
    actor: { userId: actorUser?.id || null, telegramId: actorTelegram?.telegram_id || null, name: actorName },
    data: {
      ticketId,
      claimer: {
        name: actorName,
        userId: actorUser?.id || null,
        telegramId: actorTelegram?.telegram_id || null,
      },
      group,
    },
  });

  return formatted;
};

/**
 * Add team member to ticket_assignees
 * RULE: "yang bisa menambah itu hanya leader nya"
 */
export const addAssignee = async (ticketId, data, actor) => {
  if (!actor) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  // Validasi: Status tiket harus 'escalated'
  const currentHistory =
    (ticket.ticket_history || []).find((h) => h.version === ticket.current_version) ||
    ticket.ticket_history?.[0] ||
    {};
  const currentStatus = (currentHistory.status || "open").toLowerCase();

  const role = (actor.role || "").toLowerCase();
  const division = (actor.division || "").toLowerCase();

  if (role === "admin" || role === "viewer") {
    throw createError(403, "Akses ditolak: Admin dan Viewer tidak memiliki akses untuk mengelola anggota tiket.");
  }

  if (currentStatus !== "escalated") {
    throw createError(
      403,
      `Akses ditolak: Penambahan anggota tim software hanya dapat dilakukan ketika tiket berstatus 'escalated' (status saat ini: '${currentStatus}').`
    );
  }

  if (division !== "software") {
    throw createError(403, "Akses ditolak: Hanya tim Software yang dapat menambahkan anggota ke tiket software.");
  }

  // 1. Cek leader saat ini
  const leaderAssignee = ticket.leader_assignee_id
    ? await ticketRepo.findAssigneeById(ticket.leader_assignee_id)
    : null;

  const isLeader =
    leaderAssignee &&
    ((leaderAssignee.user_id && leaderAssignee.user_id === actor.id) ||
      (leaderAssignee.telegram_user_id && leaderAssignee.telegram_user_id === actor.telegram_user_id));

  // Jika tiket sudah memiliki leader, hanya leader atau koordinator software yang ditugaskan pada tiket tersebut yang dapat menambah
  if (ticket.leader_assignee_id && !isLeader) {
    const isAssigned = await ticketRepo.findAssigneeByTicketAndMember(ticketId, {
      userId: actor.id,
      telegramUserId: actor.telegram_user_id,
    });
    if (!isAssigned) {
      throw createError(403, "Akses ditolak: Hanya Leader tiket atau anggota yang ditugaskan pada tiket ini yang dapat menambahkan anggota tim.");
    }
  }

  // 3. Resolusi anggota yang ingin ditambahkan (Web User atau Telegram User)
  let targetUser = null;
  let targetTelegram = null;

  if (data.userId) {
    targetUser = await prisma.users.findUnique({ where: { id: data.userId } });
  } else if (data.email) {
    targetUser = await prisma.users.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  }

  if (data.telegramUserId) {
    targetTelegram = await prisma.telegram_users.findUnique({ where: { id: data.telegramUserId } });
  } else if (data.telegramId) {
    targetTelegram = await prisma.telegram_users.findFirst({
      where: {
        OR: [
          { telegram_id: String(data.telegramId).trim() },
          { username: String(data.telegramId).replace(/^@/, "").trim() },
        ],
      },
    });
  }

  if (!targetUser && !targetTelegram) {
    throw createError(404, "Data pengguna atau user telegram yang akan ditambahkan tidak ditemukan.");
  }

  // 4. Validasi divisi target: Boleh dari divisi software atau after_sales
  const targetDivision = (targetUser?.division || targetTelegram?.division || "").toLowerCase();
  const targetRole = (targetUser?.role || "").toLowerCase();
  if (
    targetDivision !== "software" &&
    targetDivision !== "after_sales" &&
    targetRole !== "admin" &&
    targetRole !== "coordinator"
  ) {
    throw createError(400, "Anggota yang ditambahkan harus berasal dari divisi software atau after-sales.");
  }

  // 5. Cek apakah target sudah terdaftar di assignees
  const isAlreadyAssigned = await ticketRepo.findAssigneeByTicketAndMember(ticketId, {
    userId: targetUser?.id,
    telegramUserId: targetTelegram?.id,
  });

  if (isAlreadyAssigned) {
    throw createError(409, "Anggota tersebut sudah terdaftar dalam ticket assignees tiket ini.");
  }

  // 6. Tambahkan ke ticket_assignees
  const shouldBeLeader = Boolean(data.isLeader) || !ticket.leader_assignee_id;
  const newAssignee = await ticketRepo.addAssigneeToTicket(ticketId, {
    userId: targetUser?.id,
    telegramUserId: targetTelegram?.id,
    isLeader: shouldBeLeader,
  });

  if (shouldBeLeader) {
    await ticketRepo.setTicketLeader(ticketId, newAssignee.id);
  }

  const targetName = targetUser?.name || targetUser?.email || targetTelegram?.username || targetTelegram?.full_name || "Anggota Tim";
  const actorName = leaderAssignee?.user?.name || leaderAssignee?.telegram_user?.username || actor.name || actor.email || "Leader";

  // 7. Catat di ticket_history & naikkan versi
  const nextVersion = (ticket.current_version ?? 0) + 1;
  const historyData = {
    status: currentHistory.status || "escalated",
    damage_description: currentHistory.damage_description,
    action_taken: currentHistory.action_taken,
    root_cause: currentHistory.root_cause,
    severity: currentHistory.severity,
    notes: `Anggota tim software '${targetName}' ditambahkan oleh Leader (${actorName})`,
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
    entityType: "TicketAssignee",
    entityId: newAssignee.id,
    details: {
      identifier: ticketId,
      changeSummary: `Leader menambahkan anggota tim software '${targetName}' ke tiket ${ticketId}`,
      ticketId,
      addedMember: targetName,
    },
  });

  ticketEvents.notifyTicketUpdated(formatted);

  // Notifikasi DM ke anggota baru saja (tanpa pesan grup) — 409 duplikat
  // sudah ditolak di atas, jadi event ini tidak pernah dobel per tiket.
  publishWebhook("ticket.member_added", {
    actor: { userId: actor.id || null, telegramId: actor.telegram_user_id || null, name: actorName },
    data: {
      ticketId,
      addedBy: actorName,
      addedMember: {
        name: targetName,
        userId: targetUser?.id || null,
        telegram: targetTelegram
          ? { telegramId: targetTelegram.telegram_id, username: targetTelegram.username || null }
          : null,
      },
    },
  });

  return {
    message: `Anggota tim software '${targetName}' berhasil ditambahkan ke tiket`,
    assignee: {
      id: newAssignee.id,
      ticketId: newAssignee.ticket_id,
      userId: newAssignee.user_id,
      user_id: newAssignee.user_id,
      telegramUserId: newAssignee.telegram_user_id,
      telegram_user_id: newAssignee.telegram_user_id,
      user: newAssignee.user,
      telegramUser: newAssignee.telegram_user,
      createdAt: newAssignee.created_at,
    },
    ticket: formatted,
  };
};

/**
 * Update / edit an existing assignee in ticket_assignees
 * RULE: Hanya Leader tiket yang dapat mengubah anggota tim
 */
export const updateAssignee = async (ticketId, assigneeId, data, actor) => {
  if (!actor) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  // 1. Validasi status tiket harus 'escalated'
  const currentHistory =
    (ticket.ticket_history || []).find((h) => h.version === ticket.current_version) ||
    ticket.ticket_history?.[0] ||
    {};
  const currentStatus = (currentHistory.status || "open").toLowerCase();

  const role = (actor.role || "").toLowerCase();
  if (role === "admin" || role === "viewer") {
    throw createError(403, "Akses ditolak: Admin dan Viewer tidak memiliki akses untuk mengubah anggota tim tiket.");
  }

  if (currentStatus !== "escalated") {
    throw createError(
      403,
      `Akses ditolak: Pengubahan anggota tim software hanya dapat dilakukan ketika tiket berstatus 'escalated' (status saat ini: '${currentStatus}').`
    );
  }

  // 2. Validasi target assignee di tiket ini
  const existingAssignee = await ticketRepo.findAssigneeById(assigneeId);
  if (!existingAssignee || existingAssignee.ticket_id !== ticketId) {
    throw createError(404, "Assignee tidak ditemukan pada tiket ini.");
  }

  // 3. Validasi wewenang: HANYA Leader tiket
  const currentLeader = ticket.leader_assignee_id ? await ticketRepo.findAssigneeById(ticket.leader_assignee_id) : null;
  const isLeader =
    currentLeader &&
    ((currentLeader.user_id && currentLeader.user_id === actor.id) ||
      (currentLeader.telegram_user_id && currentLeader.telegram_user_id === actor.telegram_user_id));

  if (!isLeader) {
    throw createError(403, "Hanya Leader tiket yang dapat mengubah anggota tim software.");
  }

  // 4. Resolusi data anggota baru (jika diubah)
  let targetUser = null;
  let targetTelegram = null;

  if (data.userId) {
    targetUser = await prisma.users.findUnique({ where: { id: data.userId } });
  } else if (data.email) {
    targetUser = await prisma.users.findUnique({ where: { email: data.email.toLowerCase().trim() } });
  }

  if (data.telegramUserId) {
    targetTelegram = await prisma.telegram_users.findUnique({ where: { id: data.telegramUserId } });
  } else if (data.telegramId) {
    targetTelegram = await prisma.telegram_users.findFirst({
      where: {
        OR: [
          { telegram_id: String(data.telegramId).trim() },
          { username: String(data.telegramId).replace(/^@/, "").trim() },
        ],
      },
    });
  }

  // 5. Validasi divisi jika ada pergantian target
  if (targetUser) {
    const uDiv = (targetUser.division || "").toLowerCase();
    const uRole = (targetUser.role || "").toLowerCase();
    if (uDiv !== "software" && uRole !== "admin") {
      throw createError(400, "Pengguna yang ditugaskan harus berasal dari divisi software.");
    }
  }

  if (targetTelegram) {
    const tDiv = (targetTelegram.division || "").toLowerCase();
    if (tDiv !== "software") {
      throw createError(400, "User Telegram yang ditugaskan harus berasal dari divisi software.");
    }
  }

  const finalUserId = targetUser ? targetUser.id : (data.userId === null ? null : existingAssignee.user_id);
  const finalTelegramUserId = targetTelegram ? targetTelegram.id : (data.telegramUserId === null ? null : existingAssignee.telegram_user_id);

  if (!finalUserId && !finalTelegramUserId) {
    throw createError(400, "Assignee harus memiliki setidaknya satu User ID atau Telegram User ID.");
  }

  // 6. Cek duplikasi dengan assignee lain di tiket ini
  const duplicate = await ticketRepo.findAssigneeByTicketAndMember(ticketId, {
    userId: finalUserId,
    telegramUserId: finalTelegramUserId,
  });

  if (duplicate && duplicate.id !== assigneeId) {
    throw createError(409, "Anggota tersebut sudah terdaftar dalam ticket assignees tiket ini.");
  }

  // 7. Update assignee di database
  const updatedAssignee = await ticketRepo.updateAssigneeInTicket(assigneeId, {
    userId: finalUserId,
    telegramUserId: finalTelegramUserId,
  });

  const oldName = existingAssignee.user?.name || existingAssignee.telegram_user?.username || "Anggota Tim";
  const newName = updatedAssignee.user?.name || updatedAssignee.telegram_user?.username || "Anggota Tim";
  const actorName = currentLeader?.user?.name || actor.name || "Leader";

  // 8. Catat riwayat versi baru
  const nextVersion = (ticket.current_version ?? 0) + 1;
  const historyData = {
    status: currentHistory.status || "escalated",
    damage_description: currentHistory.damage_description,
    action_taken: currentHistory.action_taken,
    root_cause: currentHistory.root_cause,
    severity: currentHistory.severity,
    notes: `Data anggota tim software '${oldName}' diubah menjadi '${newName}' oleh Leader (${actorName})`,
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
    entityType: "TicketAssignee",
    entityId: assigneeId,
    details: {
      identifier: ticketId,
      changeSummary: `Data anggota tim software '${oldName}' diubah menjadi '${newName}' di tiket ${ticketId}`,
      ticketId,
      assigneeId,
      oldMember: oldName,
      newMember: newName,
    },
  });

  ticketEvents.notifyTicketUpdated(formatted);

  return {
    message: `Data anggota tim software berhasil diperbarui`,
    assignee: {
      id: updatedAssignee.id,
      ticketId: updatedAssignee.ticket_id,
      userId: updatedAssignee.user_id,
      user_id: updatedAssignee.user_id,
      telegramUserId: updatedAssignee.telegram_user_id,
      telegram_user_id: updatedAssignee.telegram_user_id,
      user: updatedAssignee.user,
      telegramUser: updatedAssignee.telegram_user,
      createdAt: updatedAssignee.created_at,
    },
    ticket: formatted,
  };
};

/**
 * Change leader of a ticket to another existing assignee
 */
export const changeLeader = async (ticketId, data, actor) => {
  if (!actor) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  // Validasi: Status tiket harus 'escalated'
  const currentHistory =
    (ticket.ticket_history || []).find((h) => h.version === ticket.current_version) ||
    ticket.ticket_history?.[0] ||
    {};
  const currentStatus = (currentHistory.status || "open").toLowerCase();

  const role = (actor.role || "").toLowerCase();
  if (role === "admin" || role === "viewer") {
    throw createError(403, "Akses ditolak: Admin dan Viewer tidak memiliki akses untuk mengalihkan kepemimpinan tiket.");
  }

  if (currentStatus !== "escalated") {
    throw createError(
      403,
      `Akses ditolak: Pengalihan kepemimpinan tim software hanya dapat dilakukan ketika tiket berstatus 'escalated' (status saat ini: '${currentStatus}').`
    );
  }

  if (!ticket.leader_assignee_id) {
    throw createError(400, "Tiket belum memiliki leader");
  }

  // Validasi: hanya leader saat ini yang dapat memindahkan kepemimpinan
  const currentLeader = await ticketRepo.findAssigneeById(ticket.leader_assignee_id);
  const isLeader =
    currentLeader &&
    ((currentLeader.user_id && currentLeader.user_id === actor.id) ||
      (currentLeader.telegram_user_id && currentLeader.telegram_user_id === actor.telegram_user_id));

  if (!isLeader) {
    throw createError(403, "Hanya Leader saat ini yang dapat mengalihkan kepemimpinan tiket.");
  }

  // Temukan target assignee di tiket ini
  let targetAssignee = null;
  if (data.assigneeId) {
    targetAssignee = await ticketRepo.findAssigneeById(data.assigneeId);
  } else {
    targetAssignee = await ticketRepo.findAssigneeByTicketAndMember(ticketId, {
      userId: data.userId,
      telegramUserId: data.telegramUserId,
    });
  }

  if (!targetAssignee || targetAssignee.ticket_id !== ticketId) {
    throw createError(404, "Target anggota tidak ditemukan di daftar ticket assignees tiket ini.");
  }

  if (targetAssignee.id === ticket.leader_assignee_id) {
    return formatTicket(ticket);
  }

  // Update leader
  await ticketRepo.setTicketLeader(ticketId, targetAssignee.id);

  const newLeaderName = targetAssignee.user?.name || targetAssignee.telegram_user?.username || "Anggota Baru";
  const actorName = currentLeader?.user?.name || actor.name || "Leader Lama";

  // Catat riwayat versi baru
  const nextVersion = (ticket.current_version ?? 0) + 1;
  const historyData = {
    status: currentHistory.status || "escalated",
    damage_description: currentHistory.damage_description,
    action_taken: currentHistory.action_taken,
    root_cause: currentHistory.root_cause,
    severity: currentHistory.severity,
    notes: `Kepemimpinan tim software dialihkan dari ${actorName} ke ${newLeaderName}`,
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
    entityType: "TicketLeader",
    entityId: ticketId,
    details: {
      identifier: ticketId,
      changeSummary: `Kepemimpinan tiket dialihkan ke '${newLeaderName}'`,
      ticketId,
      newLeaderAssigneeId: targetAssignee.id,
    },
  });

  ticketEvents.notifyTicketUpdated(formatted);

  return formatted;
};

/**
 * Remove an assignee from ticket
 * RULE: Leader atau anggota bersangkutan dapat menghapus keikutsertaan.
 * Data di ticket_history tetap aman dan terrecord.
 */
export const removeAssignee = async (ticketId, assigneeId, actor) => {
  if (!actor) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  // Validasi: Status tiket harus 'escalated'
  const currentHistory =
    (ticket.ticket_history || []).find((h) => h.version === ticket.current_version) ||
    ticket.ticket_history?.[0] ||
    {};
  const currentStatus = (currentHistory.status || "open").toLowerCase();

  const role = (actor.role || "").toLowerCase();
  if (role === "admin" || role === "viewer") {
    throw createError(403, "Akses ditolak: Admin dan Viewer tidak memiliki akses untuk menghapus anggota dari tiket.");
  }

  if (currentStatus !== "escalated") {
    throw createError(
      403,
      `Akses ditolak: Perubahan anggota tim software hanya dapat dilakukan ketika tiket berstatus 'escalated' (status saat ini: '${currentStatus}').`
    );
  }

  const targetAssignee = await ticketRepo.findAssigneeById(assigneeId);
  if (!targetAssignee || targetAssignee.ticket_id !== ticketId) {
    throw createError(404, "Assignee tidak ditemukan pada tiket ini.");
  }

  // Yang dapat menghapus: Leader atau anggota itu sendiri (keluar dari tiket)
  const currentLeader = ticket.leader_assignee_id ? await ticketRepo.findAssigneeById(ticket.leader_assignee_id) : null;
  const isLeader =
    currentLeader &&
    ((currentLeader.user_id && currentLeader.user_id === actor.id) ||
      (currentLeader.telegram_user_id && currentLeader.telegram_user_id === actor.telegram_user_id));

  const isSelf =
    (targetAssignee.user_id && targetAssignee.user_id === actor.id) ||
    (targetAssignee.telegram_user_id && targetAssignee.telegram_user_id === actor.telegram_user_id);

  if (!isLeader && !isSelf) {
    const isAssigned = await ticketRepo.findAssigneeByTicketAndMember(ticketId, {
      userId: actor.id,
      telegramUserId: actor.telegram_user_id,
    });
    if (!isAssigned) {
      throw createError(403, "Hanya Leader, koordinator yang ditugaskan, atau anggota bersangkutan yang dapat menghapus keikutsertaan dari tiket.");
    }
  }

  // Jika yang dihapus adalah Leader saat ini, alihkan ke anggota berikutnya atau null
  if (targetAssignee.id === ticket.leader_assignee_id) {
    const remaining = await prisma.ticket_assignees.findFirst({
      where: { ticket_id: ticketId, id: { not: assigneeId } },
      orderBy: { created_at: "asc" },
    });
    if (remaining) {
      await ticketRepo.setTicketLeader(ticketId, remaining.id);
    } else {
      await ticketRepo.setTicketLeader(ticketId, null);
    }
  }

  await ticketRepo.removeAssigneeFromTicket(ticketId, assigneeId);

  const memberName = targetAssignee.user?.name || targetAssignee.telegram_user?.username || "Anggota Tim";
  const actorName = actor.name || actor.email || "Leader";

  // Catat riwayat versi baru
  const nextVersion = (ticket.current_version ?? 0) + 1;
  const historyData = {
    status: currentHistory.status || "escalated",
    damage_description: currentHistory.damage_description,
    action_taken: currentHistory.action_taken,
    root_cause: currentHistory.root_cause,
    severity: currentHistory.severity,
    notes: `${memberName} ${isSelf ? "keluar dari" : "dihapus oleh Leader dari"} tim software tiket`,
    changed_by_user_id: actor.id || null,
    changed_by_telegram_user_id: actor.telegram_user_id || null,
  };

  const updatedRaw = await ticketRepo.updateWithHistory(ticketId, nextVersion, historyData);
  const formatted = formatTicket(updatedRaw);

  await recordLog({
    actor: actorName,
    actorUserId: actor.id || null,
    action: "delete",
    deleteAction: "SOFT",
    entityType: "TicketAssignee",
    entityId: assigneeId,
    details: {
      identifier: ticketId,
      changeSummary: `${memberName} dihapus dari tim software tiket ${ticketId}`,
      ticketId,
      removedMember: memberName,
    },
  });

  ticketEvents.notifyTicketUpdated(formatted);

  return {
    message: `Anggota '${memberName}' berhasil dihapus dari tiket`,
    ticket: formatted,
  };
};
