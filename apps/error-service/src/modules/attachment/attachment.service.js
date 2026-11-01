import createError from "http-errors";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import prisma from "../../config/prisma.js";
import { recordLog } from "../audit-log/audit-log.service.js";
import * as storage from "./attachment.storage.js";
import { MAX_FILE_SIZE as MAX_IMAGE_SIZE, MAX_PER_TICKET as MAX_IMAGES_PER_TICKET, isSvg, sanitizeFileName, toWebp } from "./attachment.image.js";
import {
  MAX_VIDEO_SIZE,
  MAX_VIDEOS_PER_TICKET,
  VIDEO_STAGING_DIR,
  safeUnlink,
} from "./attachment.video.js";
import { getVideoTranscodeQueue } from "./attachment.queue.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const formatAttachment = (a) => ({
  id: a.id,
  fileType: (a.file_type || "image").toUpperCase(),
  status: (a.status || "ready").toUpperCase(),
  url: `/tickets/${a.ticket_id}/attachments/${a.id}/content`,
  thumbnailUrl: a.thumbnail_url
    ? `/tickets/${a.ticket_id}/attachments/${a.id}/thumbnail`
    : null,
  fileName: a.file_name,
  mimeType: a.mime_type,
  size: a.file_size,
  duration: a.duration,
  errorMessage: a.error_message,
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
  if (!file || (!file.buffer && !file.path)) {
    throw createError(400, "File wajib diunggah pada field 'file'");
  }

  if (!storage.isConfigured()) {
    if (file.path) await safeUnlink(file.path);
    throw createError(503, "Penyimpanan lampiran belum dikonfigurasi");
  }

  const ticket = await findTicket(ticketId);
  assertCanUpload(ticket, actor);

  const mimetype = (file.mimetype || "").toLowerCase();
  const isVideo = mimetype.startsWith("video/") || /\.(mp4|mov|mkv|avi|webm)$/i.test(file.originalname);
  const isImage = mimetype.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.originalname);

  // SVG dilarang
  if (isSvg(mimetype) || /\.svg$/i.test(file.originalname)) {
    if (file.path) await safeUnlink(file.path);
    throw createError(400, "Format SVG tidak diperbolehkan");
  }

  if (!isImage && !isVideo) {
    if (file.path) await safeUnlink(file.path);
    throw createError(400, "Format file tidak didukung. Hanya gambar dan video yang diperbolehkan");
  }

  // ----------------------------------------------------
  // A. Penanganan Upload File Video (Asinkron BullMQ)
  // ----------------------------------------------------
  if (isVideo) {
    if (file.size > MAX_VIDEO_SIZE) {
      if (file.path) await safeUnlink(file.path);
      throw createError(413, "Ukuran video maksimal 350 MB");
    }

    const existingVideos = await prisma.ticket_attachments.count({
      where: { ticket_id: ticketId, file_type: "video" },
    });

    if (existingVideos >= MAX_VIDEOS_PER_TICKET) {
      if (file.path) await safeUnlink(file.path);
      throw createError(409, `Lampiran video tiket maksimal ${MAX_VIDEOS_PER_TICKET} video`);
    }

    const id = randomUUID();
    let rawFilePath = file.path;

    // Jika file datang sebagai memory buffer (misal di test environment)
    if (!rawFilePath && file.buffer) {
      rawFilePath = path.join(VIDEO_STAGING_DIR, `${id}.raw`);
      await fs.writeFile(rawFilePath, file.buffer);
    }

    // Insert record awal dengan status 'pending'
    const row = await prisma.ticket_attachments.create({
      data: {
        id,
        ticket_id: ticketId,
        file_type: "video",
        status: "pending",
        file_url: null,
        thumbnail_url: null,
        file_name: sanitizeFileName(file.originalname),
        mime_type: "video/mp4", // target MIME setelah konversi
        file_size: file.size,
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

    // Masukkan job ke antrean BullMQ
    try {
      await getVideoTranscodeQueue().add("transcode", {
        attachmentId: id,
        ticketId,
        rawFilePath,
        originalFileName: sanitizeFileName(file.originalname),
        actor: {
          id: actor.id || null,
          username: actor.username || null,
          name: actor.name || null,
          email: actor.email || null,
        },
      });
    } catch (queueError) {
      console.error("[attachment] Gagal memasukkan job ke antrean BullMQ:", queueError.message);
      // Update status failed jika antrean gagal
      await prisma.ticket_attachments.update({
        where: { id },
        data: { status: "failed", error_message: "Gagal mendaftarkan antrean transkoding video" },
      });
    }

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
        changeSummary: `unggah video '${row.file_name}' (sedang diantrekan) pada tiket ${ticketId}`,
      },
    });

    return formatAttachment(row);
  }

  // ----------------------------------------------------
  // B. Penanganan Upload File Foto (Sinkron Sharp -> WebP)
  // ----------------------------------------------------
  if (file.size > MAX_IMAGE_SIZE) {
    if (file.path) await safeUnlink(file.path);
    throw createError(413, "Ukuran gambar maksimal 5 MB");
  }

  const existingImages = await prisma.ticket_attachments.count({
    where: { ticket_id: ticketId, file_type: "image" },
  });

  if (existingImages >= MAX_IMAGES_PER_TICKET) {
    if (file.path) await safeUnlink(file.path);
    throw createError(409, `Lampiran tiket maksimal ${MAX_IMAGES_PER_TICKET} gambar`);
  }

  const id = randomUUID();
  let imageBuffer = file.buffer;

  if (!imageBuffer && file.path) {
    imageBuffer = await fs.readFile(file.path);
    await safeUnlink(file.path);
  }

  const webp = await toWebp(imageBuffer);
  const key = `tickets/${ticketId}/${id}.webp`;

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
      file_type: "image",
      status: "ready",
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

export const getAttachmentObject = async (ticketId, attachmentId, range) => {
  const row = await findAttachment(ticketId, attachmentId);

  if (!storage.isConfigured()) {
    throw createError(503, "Penyimpanan lampiran belum dikonfigurasi");
  }

  if (row.status === "pending" || row.status === "processing") {
    throw createError(409, "Video masih dalam antrean konversi, silakan coba beberapa saat lagi");
  }

  if (row.status === "failed") {
    throw createError(422, `Pemrosesan video gagal: ${row.error_message || "File tidak dapat diproses"}`);
  }

  if (!row.file_url) {
    throw createError(404, "File lampiran belum tersedia");
  }

  try {
    const object = await storage.getObject(row.file_url, range);
    return { row, object };
  } catch (error) {
    if (error.statusCode === 503) throw error;
    console.error(`[attachment] getObject gagal (${row.file_url}):`, error.name, error.code || "", error.message);
    throw createError(502, "Gagal membaca file dari penyimpanan");
  }
};

export const getAttachmentThumbnail = async (ticketId, attachmentId) => {
  const row = await findAttachment(ticketId, attachmentId);

  if (!storage.isConfigured()) {
    throw createError(503, "Penyimpanan lampiran belum dikonfigurasi");
  }

  if (!row.thumbnail_url) {
    throw createError(404, "Thumbnail tidak tersedia untuk lampiran ini");
  }

  try {
    const object = await storage.getObject(row.thumbnail_url);
    return { row, object };
  } catch (error) {
    if (error.statusCode === 503) throw error;
    console.error(`[attachment] getObject thumbnail gagal (${row.thumbnail_url}):`, error.name, error.code || "", error.message);
    throw createError(502, "Gagal membaca thumbnail dari penyimpanan");
  }
};

export const deleteAttachment = async (ticketId, attachmentId, actor) => {
  assertCanDelete(actor);
  const row = await findAttachment(ticketId, attachmentId);

  // Hapus file utama di S3 jika ada
  if (row.file_url) {
    try {
      await storage.deleteObject(row.file_url);
    } catch (error) {
      if (error.statusCode === 503) throw error;
      console.error(`[attachment] deleteObject gagal (${row.file_url}):`, error.name, error.code || "", error.message);
    }
  }

  // Hapus thumbnail di S3 jika ada
  if (row.thumbnail_url) {
    try {
      await storage.deleteObject(row.thumbnail_url);
    } catch (error) {
      console.error(`[attachment] deleteObject thumbnail gagal (${row.thumbnail_url}):`, error.name, error.code || "", error.message);
    }
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
