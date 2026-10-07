import createError from "http-errors";
import prisma from "../../../config/prisma.js";
import * as ticketRepo from "../ticket.repository.js";

/**
 * Permission checker for updating tickets:
 * - Tim Aftersales: dapat melakukan perubahan tiket tanpa harus masuk ke ticket_assignees.
 * - Tim Software: HANYA yang terdaftar di ticket_assignees yang dapat melakukan perubahan tiket DAN tiket harus berstatus 'escalated'.
 * - Role Admin: memiliki akses penuh.
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

  // 1. Admin memiliki hak akses penuh
  if (role === "admin") {
    return { actorUser, actorTelegram, division, role, currentStatus };
  }

  // 2. Tim Aftersales: bebas mengupdate tanpa harus di ticket_assignees
  if (division === "after_sales") {
    return { actorUser, actorTelegram, division, role, currentStatus };
  }

  // 3. Tim Software: HANYA bisa melakukan perubahan ketika tiket berstatus 'escalated'
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

  // 4. Divisi lainnya / belum diset: jika terdaftar sebagai assignee diizinkan hanya jika tiket berstatus 'escalated'
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
