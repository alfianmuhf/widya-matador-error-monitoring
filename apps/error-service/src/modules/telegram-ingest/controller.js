import * as telegramIngestService from "./service.js";

/**
 * POST /telegram/attachments (internal)  ==  POST /api/telegram/attachments (eksternal via nginx)
 * 201 gambar / 202 video pending / 200 replay idempoten.
 */
export const uploadAttachment = async (req, res, next) => {
  try {
    const { replayed, attachment } = await telegramIngestService.ingestAttachment(
      req.file,
      req.body,
      {
        idempotencyKey: req.get("Idempotency-Key"),
        chatId: req.body?.chat_id,
      }
    );

    if (replayed) {
      return res.status(200).json({
        success: true,
        message: "Lampiran sudah dibuat sebelumnya (Idempotency-Key sama)",
        data: { attachment, replayed: true },
      });
    }

    const statusCode = attachment.status === "PENDING" ? 202 : 201;
    res.status(statusCode).json({
      success: true,
      message:
        attachment.status === "PENDING"
          ? "Video berhasil diunggah dan sedang diproses dalam antrean"
          : "Lampiran berhasil diunggah",
      data: { attachment, replayed: false },
    });
  } catch (error) {
    next(error);
  }
};
