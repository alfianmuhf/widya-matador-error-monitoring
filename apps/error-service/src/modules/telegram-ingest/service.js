import createError from "http-errors";
import prisma from "../../config/prisma.js";
import { uploadAttachment, formatAttachment } from "../attachment/attachment.service.js";
import { parseIngestBody, parseIdempotencyKey } from "./schema.js";

const ATTACHMENT_INCLUDE = {
  uploaded_by_user: { select: { id: true, name: true, username: true, email: true } },
  uploaded_by_telegram: { select: { id: true, username: true, full_name: true } },
};

/**
 * Resolusi identitas Telegram → whitelist → akun platform.
 * API key hanya autentikasi mesin; otorisasi orang = whitelist + assertCanUpload
 * milik attachment.service (relasi tiket tidak dilonggarkan).
 */
const resolveActor = async ({ telegramUserId, telegramUsername }) => {
  const whitelisted = await prisma.telegram_users.findFirst({
    where: telegramUserId
      ? { OR: [{ telegram_id: telegramUserId }, { username: telegramUsername }] }
      : { username: telegramUsername },
  });

  if (!whitelisted) {
    throw createError(403, "Identitas Telegram tidak terdaftar pada whitelist");
  }

  if (whitelisted.is_active === false) {
    throw createError(403, "Identitas Telegram pada whitelist nonaktif");
  }

  const platformUser = await prisma.users.findFirst({
    where: { telegram_user_id: whitelisted.id },
    select: { id: true, name: true, username: true, email: true, role: true, telegram_user_id: true },
  });

  if (!platformUser) {
    throw createError(403, "Identitas Telegram belum tertaut ke akun platform");
  }

  return platformUser;
};

/**
 * Cek replay + tangkap benturan unik bersamaan.
 * Row failed → 409 (ulang dengan key baru); row pending/processing/ready → 200.
 */
export const findReplayedAttachment = async (ticketId, idempotencyKey) => {
  const row = await prisma.ticket_attachments.findFirst({
    where: { ticket_id: ticketId, idempotency_key: idempotencyKey },
    include: ATTACHMENT_INCLUDE,
  });

  if (!row) return null;

  if (row.status === "failed") {
    throw createError(
      409,
      "Lampiran dengan Idempotency-Key ini berstatus gagal; kirim ulang dengan key baru"
    );
  }

  return { replayed: true, attachment: formatAttachment(row) };
};

export const ingestAttachment = async (file, body, requestPayload = {}) => {
  const parsed = parseIngestBody(body);
  const ticketId = parsed.ticket_id;
  const identity = { telegramUserId: parsed.telegram_user_id, telegramUsername: parsed.telegram_username };

  const idempotencyKey = parseIdempotencyKey(requestPayload.idempotencyKey);
  const actor = await resolveActor(identity);

  if (idempotencyKey) {
    const replay = await findReplayedAttachment(ticketId, idempotencyKey);
    if (replay) return replay;
  }

  try {
    const attachment = await uploadAttachment(ticketId, file, actor, {
      idempotencyKey,
      chatId: requestPayload.chatId || null,
    });
    return { replayed: false, attachment };
  } catch (err) {
    // Race antar-replica: baris dibuat bersamaan → jawab idempoten seperti replay
    if (err?.code === "P2002" && idempotencyKey) {
      const replay = await findReplayedAttachment(ticketId, idempotencyKey);
      if (replay) return replay;
    }
    throw err;
  }
};
