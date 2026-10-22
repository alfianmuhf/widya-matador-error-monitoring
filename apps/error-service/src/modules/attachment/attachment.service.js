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
});

const findTicket = async (ticketId) => {
  const ticket = await prisma.tickets.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      aftersales_user_id: true,
      ticket_assignees: { select: { user_id: true } },
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
  if (role === "admin" || role === "coordinator") return;

  const isAssignee = ticket.ticket_assignees.some((a) => a.user_id === actor.id);
  const isAftersales = ticket.aftersales_user_id === actor.id;

  if (isAssignee || isAftersales) return;

  throw createError(403, "Akses ditolak: hanya tim tiket yang dapat mengunggah lampiran");
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
    },
  });

  await recordLog({
    actor: actor.email || actor.name || "Sistem",
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
      changeSummary: `hapus lampiran '${row.file_name}' dari tiket ${ticketId}`,
    },
  });
};
