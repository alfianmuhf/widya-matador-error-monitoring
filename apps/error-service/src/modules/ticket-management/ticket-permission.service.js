import createError from "http-errors";
import prisma from "../../config/prisma.js";
import * as ticketRepo from "../ticket/ticket.repository.js";

/**
 * Permission checker for updating tickets:
 * - Role Admin: Tidak memiliki akses di manajemen tiket (403).
 * - Role Viewer: Hanya memiliki akses membaca tiket (403).
 * - Tim Aftersales: Hanya dapat mengelola tiket yang berstatus 'open' dan dibuat oleh dirinya.
 * - Tim Software: HANYA yang terdaftar di ticket_assignees DAN tiket harus berstatus 'escalated'.
 */
export const checkUpdateTicketPermission = async (ticketId, actor, currentTicket = null) => {
  if (!actor) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const ticket = currentTicket || (await ticketRepo.findById(ticketId));
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  const currentHistory =
    (ticket.ticket_history || []).find((h) => h.version === ticket.current_version) ||
    ticket.ticket_history?.[0] ||
    {};
  const currentStatus = (currentHistory.status || "open").toLowerCase();

  let actorUser = null;
  if (actor.id) {
    actorUser = await prisma.users.findUnique({
      where: { id: actor.id },
      select: { id: true, role: true, division: true, name: true, username: true },
    });
  }

  let actorTelegram = null;
  if (actor.telegram_user_id || actor.telegramId) {
    actorTelegram = await prisma.telegram_users.findFirst({
      where: {
        OR: [
          ...(actor.telegram_user_id ? [{ id: actor.telegram_user_id }] : []),
          ...(actor.telegramId ? [{ telegram_id: String(actor.telegramId) }] : []),
        ],
      },
      select: { id: true, division: true, full_name: true, username: true, telegram_id: true },
    });
  }

  const role = (actorUser?.role || actor.role || "").toLowerCase();
  const division = (actorUser?.division || actorTelegram?.division || actor.division || "").toLowerCase();

  // 1. Role Admin: Tidak dapat melakukan update tiket (hanya koordinator sesuai divisi dan status)
  if (role === "admin") {
    throw createError(
      403,
      "Akses ditolak: Admin tidak memiliki akses untuk update tiket. Pembaruan tiket hanya dapat dilakukan oleh Koordinator sesuai divisi dan status tiket."
    );
  }

  // 2. Role Viewer: Hanya memiliki akses membaca tiket
  if (role === "viewer") {
    throw createError(
      403,
      "Akses ditolak: Viewer hanya memiliki akses membaca tiket."
    );
  }

  // 3. Wajib role Coordinator
  if (role !== "coordinator") {
    throw createError(
      403,
      "Akses ditolak: Pembaruan tiket hanya dapat dilakukan oleh Koordinator sesuai divisi dan status tiket."
    );
  }

  // 3. Tim Aftersales: Mengelola tiket yang berstatus 'open' dan ditugaskan pada dirinya (aftersales_user_id)
  if (division === "after_sales") {
    if (currentStatus !== "open") {
      throw createError(
        403,
        `Akses ditolak: Tim aftersales hanya dapat melakukan perubahan ketika tiket berstatus 'open' (status saat ini: '${currentStatus}').`
      );
    }

    if (actorUser?.id) {
      const isResponsible = ticket.aftersales_user_id === actorUser.id;
      if (!isResponsible) {
        throw createError(
          403,
          "Akses ditolak: Hanya penanggung jawab Aftersales pada tiket ini yang dapat melakukan pembaruan."
        );
      }
    }

    return { actorUser, actorTelegram, division, role, currentStatus };
  }

  // 4. Tim RnD: HANYA bisa melakukan perubahan ketika tiket berstatus 'escalated'
  // dan WAJIB terdaftar dalam ticket_assignees tiket ini
  if (division === "rnd" || division === "software") {
    if (currentStatus !== "escalated") {
      throw createError(
        403,
        `Akses ditolak: Tim RnD hanya dapat melakukan perubahan ketika tiket berstatus 'escalated' (status saat ini: '${currentStatus}').`
      );
    }

    const isAssigned = await ticketRepo.isUserAssignedToTicket(ticketId, actorUser?.id);

    if (!isAssigned) {
      throw createError(
        403,
        "Akses ditolak: Hanya anggota atau leader dari tim yang ditugaskan pada tiket ini yang dapat melakukan perubahan tiket."
      );
    }

    return { actorUser, actorTelegram, division, role, isAssigned, currentStatus };
  }

  // 5. Divisi lainnya / fallback: jika terdaftar sebagai anggota/leader tim tiket diizinkan hanya jika tiket berstatus 'escalated'
  const isAssigned = await ticketRepo.isUserAssignedToTicket(ticketId, actorUser?.id);

  if (isAssigned) {
    if (currentStatus !== "escalated") {
      throw createError(
        403,
        `Akses ditolak: Perubahan tiket oleh tim hanya dapat dilakukan ketika tiket berstatus 'escalated' (status saat ini: '${currentStatus}').`
      );
    }
    return { actorUser, actorTelegram, division, role, isAssigned, currentStatus };
  }

  throw createError(
    403,
    "Akses ditolak: Anda tidak memiliki wewenang untuk memperbarui tiket ini."
  );
};

/**
 * Permission checker for managing teams on a ticket (handover, add team, remove team):
 * - Admin can manage teams on any ticket.
 * - Coordinator: Must be the Leader of the ticket's current_team!
 */
export const checkManageTicketTeamsPermission = async (ticketId, actor) => {
  if (!actor) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const role = (actor.role || "").toLowerCase();
  if (role === "admin") return true;

  if (role !== "coordinator") {
    throw createError(403, "Akses ditolak: Hanya Koordinator Leader atau Admin yang dapat mengelola tim tiket.");
  }

  const ticket = await ticketRepo.findById(ticketId);
  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  // Jika tiket belum memiliki tim penanggung jawab, koordinator leader tim RnD mana pun boleh menetapkan tim
  if (!ticket.current_team_id) {
    return true;
  }

  // Cek apakah actor adalah leader dari tim penanggung jawab utama saat ini di tabel tickets (current_team_id)
  const isPrimaryLeader =
    ticket.current_team?.leader_user_id === actor.id ||
    ticket.current_team?.leader?.id === actor.id;

  if (!isPrimaryLeader) {
    const leaderName = ticket.current_team?.leader?.name || "Leader tim utama";
    const teamName = ticket.current_team?.name || "Tim Utama";
    throw createError(
      403,
      `Akses ditolak: Hanya Leader dari tim penanggung jawab utama tiket (${teamName} - ${leaderName}) atau Admin yang berwenang mengelola tim tiket.`
    );
  }

  return true;
};
