import createError from "http-errors";
import { randomUUID } from "node:crypto";
import prisma from "../../config/prisma.js";
import { recordLog } from "../audit-log/audit-log.service.js";
import * as storage from "./attachment.storage.js";
import { MAX_FILE_SIZE, MAX_PER_TICKET, isSvg, sanitizeFileName, toWebp } from "./attachment.image.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const formatAttachment = (a) => ({
  id: a.id,
  url: `/tickets/${a.ticket_id}/attachments/${a.id}/content`,
  fileName: a.file_name,
  mimeType: a.mime_type,
  size: a.file_size,
  uploadedAt: a.uploaded_at,
  uploadedBy: a.uploaded_by_user
    ? {
        type: "user",
        id: a.uploaded_by_user.id,
        name: a.uploaded_by_user.name,
        username: a.uploaded_by_user.username,
        email: a.uploaded_by_user.username,
      }
    : a.uploaded_by_telegram
    ? {
        type: "telegram",
        id: a.uploaded_by_telegram.id,
        name: a.uploaded_by_telegram.full_name || a.uploaded_by_telegram.username,
        username: a.uploaded_by_telegram.username,
      }
    : null,
});

const findTicket = async (ticketId) => {
  const ticket = await prisma.tickets.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      aftersales_user_id: true,
      current_team_id: true,
      current_team: {
        select: {
          id: true,
          leader_user_id: true,
          members: { select: { user_id: true } },
        },
      },
      ticket_teams: {
        select: {
          team_id: true,
          team: {
            select: {
              id: true,
              leader_user_id: true,
              members: { select: { user_id: true } },
            },
          },
        },
      },
    },
  });

  if (!ticket) {
    throw createError(404, `Tiket '${ticketId}' tidak ditemukan`);
  }

  return ticket;
};

const assertCanUpload = (ticket, actor) => {
  if (!actor) {
    throw createError(401, "Autentikasi diperlukan");
  }

  const role = (actor.role || "").toLowerCase();
  if (role === "admin") return;

  const isAftersales = ticket.aftersales_user_id === actor.id;

  const isCurrentTeamLeaderOrMember =
    ticket.current_team &&
    (ticket.current_team.leader_user_id === actor.id ||
      ticket.current_team.members.some((m) => m.user_id === actor.id));

  const isAssignedTeamLeaderOrMember = (ticket.ticket_teams || []).some(
    (tt) =>
      tt.team?.leader_user_id === actor.id ||
      tt.team?.members.some((m) => m.user_id === actor.id)
  );

  if (isAftersales || isCurrentTeamLeaderOrMember || isAssignedTeamLeaderOrMember) return;

  throw createError(403, "Akses ditolak: hanya tim yang ditugaskan pada tiket yang dapat mengunggah lampiran");
};

const assertCanDelete = (actor) => {
  const role = (actor?.role || "").toLowerCase();
  if (role !== "admin" && role !== "coordinator") {
    throw createError(403, "Akses dilarang: hanya Admin atau Koordinator yang dapat menghapus lampiran");
  }
};

const findAttachment = async (ticketId, attachmentId) => {
  if (!UUID_RE.test(attachmentId)) {
    throw createError(404, "Lampiran tidak ditemukan");
  }

  const row = await prisma.ticket_attachments.findFirst({
    where: { id: attachmentId, ticket_id: ticketId },
  });

  if (!row) {
    throw createError(404, "Lampiran tidak ditemukan");
  }

  return row;
};

export const listAttachments = async (ticketId) => {
  await findTicket(ticketId);

  const rows = await prisma.ticket_attachments.findMany({
    where: { ticket_id: ticketId },
    include: {
      uploaded_by_user: {
        select: { id: true, name: true, username: true },
      },
      uploaded_by_telegram: {
        select: { id: true, username: true, full_name: true },
      },
    },
    orderBy: { uploaded_at: "asc" },
  });

  return rows.map(formatAttachment);
};

export const uploadAttachment = async (ticketId, file, actor) => {
  if (!file?.buffer) {
    throw createError(400, "File gambar wajib diunggah pada field 'file'");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw createError(413, "Ukuran gambar maksimal 5 MB");
  }

  // SVG dirasterisasi oleh sharp: vektor XXE/CPU, tolak sebelum konversi
  if (isSvg(file.mimetype)) {
    throw createError(400, "Format SVG tidak diperbolehkan");
  }

  if (!storage.isConfigured()) {
    throw createError(503, "Penyimpanan lampiran belum dikonfigurasi");
  }

  const ticket = await findTicket(ticketId);
  assertCanUpload(ticket, actor);

  const existing = await prisma.ticket_attachments.count({ where: { ticket_id: ticketId } });
  if (existing >= MAX_PER_TICKET) {
    throw createError(409, `Lampiran tiket maksimal ${MAX_PER_TICKET} gambar`);
  }

  const id = randomUUID();
  const webp = await toWebp(file.buffer);
  const key = `tickets/${ticketId}/${id}.webp`;

  // Objek ditulis lebih dulu: kegagalan storage tidak boleh meninggalkan baris yatim
  try {
    await storage.putObject(key, webp.buffer, "image/webp");
  } catch (error) {
    if (error.statusCode === 503) throw error;
    console.error(`[attachment] putObject gagal (${key}):`, error.name, error.code || "", error.message);
    throw createError(502, "Gagal menyimpan gambar ke penyimpanan");
  }

  const row = await prisma.ticket_attachments.create({
    data: {
      id,
      ticket_id: ticketId,
      file_url: key,
      file_name: sanitizeFileName(file.originalname),
      mime_type: "image/webp",
      file_size: webp.size,
      uploaded_by_user_id: actor.id || null,
      uploaded_by_telegram_user_id: actor.telegram_user_id || actor.telegramUserId || null,
    },
    include: {
      uploaded_by_user: {
        select: { id: true, name: true, username: true },
      },
      uploaded_by_telegram: {
        select: { id: true, username: true, full_name: true },
      },
    },
  });

  await recordLog({
    actor: actor.username || actor.name || actor.email || "Sistem",
    actorUserId: actor.id || null,
    action: "CREATE",
    entityType: "TicketAttachment",
    entityId: row.id,
    details: {
      identifier: row.file_name,
      ticketId,
      fileName: row.file_name,
      size: row.file_size,
      mimeType: row.mime_type,
      changeSummary: `tambah lampiran '${row.file_name}' pada tiket ${ticketId}`,
    },
  });

  return formatAttachment(row);
};

export const getAttachmentObject = async (ticketId, attachmentId) => {
  const row = await findAttachment(ticketId, attachmentId);

  if (!storage.isConfigured()) {
    throw createError(503, "Penyimpanan lampiran belum dikonfigurasi");
  }

  try {
    const object = await storage.getObject(row.file_url);
    return { row, object };
  } catch (error) {
    if (error.statusCode === 503) throw error;
    console.error(`[attachment] getObject gagal (${row.file_url}):`, error.name, error.code || "", error.message);
    throw createError(502, "Gagal membaca gambar dari penyimpanan");
  }
};

export const deleteAttachment = async (ticketId, attachmentId, actor) => {
  assertCanDelete(actor);
  const row = await findAttachment(ticketId, attachmentId);

  // Urutan ini menjaga UI: baris tidak hilang selama objek masih ada
  try {
    await storage.deleteObject(row.file_url);
  } catch (error) {
    if (error.statusCode === 503) throw error;
    console.error(`[attachment] deleteObject gagal (${row.file_url}):`, error.name, error.code || "", error.message);
    throw createError(502, "Gagal menghapus gambar dari penyimpanan");
  }

  await prisma.ticket_attachments.delete({ where: { id: row.id } });

  await recordLog({
    actor: actor.email || actor.name || "Sistem",
    actorUserId: actor.id || null,
    action: "DELETE",
    deleteAction: "hard",
    entityType: "TicketAttachment",
    entityId: row.id,
    details: {
      identifier: row.file_name,
      ticketId,
      fileName: row.file_name,
      size: row.file_size,
      mimeType: row.mime_type,
      changeSummary: `hapus lampiran '${row.file_name}' dari tiket ${ticketId}`,
    },
  });
};
