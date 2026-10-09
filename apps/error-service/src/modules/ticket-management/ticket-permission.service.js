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
      select: { id: true, role: true, division: true, name: true, email: true },
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

  // 1. Role Admin: Tidak memiliki akses di manajemen tiket
  if (role === "admin") {
    throw createError(
      403,
      "Akses ditolak: Admin tidak memiliki akses untuk mengelola atau memperbarui tiket."
    );
  }

  // 2. Role Viewer: Hanya memiliki akses membaca tiket
  if (role === "viewer") {
    throw createError(
      403,
      "Akses ditolak: Viewer hanya memiliki akses membaca tiket."
    );
  }

  // 3. Tim Aftersales: Mengelola tiket yang berstatus 'open' dan dibuat oleh dirinya
  if (division === "after_sales") {
    if (currentStatus !== "open") {
      throw createError(
        403,
        `Akses ditolak: Tim aftersales hanya dapat melakukan perubahan ketika tiket berstatus 'open' (status saat ini: '${currentStatus}').`
      );
    }

    // Jika user web, pastikan dia adalah pembuat tiket (dilihat dari history version 1 atau 0)
    if (actorUser?.id) {
      const isCreator = (ticket.ticket_history || []).some(
        (h) => (h.version === 1 || h.version === 0) && h.changed_by_user_id === actorUser.id
      );
      if (!isCreator) {
        throw createError(
          403,
          "Akses ditolak: Anda hanya dapat mengelola tiket yang Anda buat sendiri."
        );
      }
    }

    return { actorUser, actorTelegram, division, role, currentStatus };
  }

  // 4. Tim Software: HANYA bisa melakukan perubahan ketika tiket berstatus 'escalated'
  // dan WAJIB terdaftar dalam ticket_assignees tiket ini
  if (division === "software") {
    if (currentStatus !== "escalated") {
      throw createError(
        403,
        `Akses ditolak: Tim software hanya dapat melakukan perubahan ketika tiket berstatus 'escalated' (status saat ini: '${currentStatus}').`
      );
    }

    const isAssigned = await ticketRepo.findAssigneeByTicketAndMember(ticketId, {
      userId: actorUser?.id,
      telegramUserId: actorTelegram?.id,
    });

    if (!isAssigned) {
      throw createError(
        403,
        "Akses ditolak: Hanya anggota tim software yang terdaftar pada tiket ini yang dapat melakukan perubahan tiket. Silakan minta leader tim software untuk menambahkan Anda ke tiket."
      );
    }

    return { actorUser, actorTelegram, division, role, isAssigned, currentStatus };
  }

  // 5. Divisi lainnya / belum diset: jika terdaftar sebagai assignee diizinkan hanya jika tiket berstatus 'escalated'
  const isAssigned = await ticketRepo.findAssigneeByTicketAndMember(ticketId, {
    userId: actorUser?.id,
    telegramUserId: actorTelegram?.id,
  });

  if (isAssigned) {
    if (currentStatus !== "escalated") {
      throw createError(
        403,
        `Akses ditolak: Perubahan tiket oleh assignee hanya dapat dilakukan ketika tiket berstatus 'escalated' (status saat ini: '${currentStatus}').`
      );
    }
    return { actorUser, actorTelegram, division, role, isAssigned, currentStatus };
  }

  throw createError(
    403,
    "Akses ditolak: Anda tidak memiliki wewenang untuk memperbarui tiket ini."
  );
};
