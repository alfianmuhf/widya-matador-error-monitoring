import { pipeline } from "node:stream";
import * as attachmentService from "./attachment.service.js";

/**
 * GET /tickets/:id/attachments
 */
export const listAttachments = async (req, res, next) => {
  try {
    const attachments = await attachmentService.listAttachments(req.params.id);
    res.status(200).json({
      success: true,
      message: "Daftar lampiran berhasil diambil",
      data: { attachments },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /tickets/:id/attachments
 */
export const uploadAttachment = async (req, res, next) => {
  try {
    const attachment = await attachmentService.uploadAttachment(req.params.id, req.file, req.user);
    const statusCode = attachment.status === "PENDING" ? 202 : 201;
    res.status(statusCode).json({
      success: true,
      message: attachment.status === "PENDING" 
        ? "Video berhasil diunggah dan sedang diproses dalam antrean" 
        : "Lampiran berhasil diunggah",
      data: { attachment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tickets/:id/attachments/:attachmentId/content
 * Mendukung HTTP 206 Partial Content (Range Streaming)
 */
export const getAttachmentContent = async (req, res, next) => {
  try {
    const range = req.headers.range;
    const { row, object } = await attachmentService.getAttachmentObject(
      req.params.id,
      req.params.attachmentId,
      range
    );

    res.setHeader("Content-Type", row.mime_type || "application/octet-stream");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "private, max-age=300");

    // Jika client meminta chunk tertentu via Range header (video playback/seeking)
    if (range && object.ContentRange) {
      res.status(206);
      res.setHeader("Content-Range", object.ContentRange);
    } else {
      res.status(200);
    }

    if (object.ContentLength) {
      res.setHeader("Content-Length", object.ContentLength);
    }

    // Pipeline menutup response bila stream storage error, bukan menggantung
    pipeline(object.Body, res, (error) => {
      if (error) {
        console.error("[attachment] stream gagal:", error.message);
        res.destroy();
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tickets/:id/attachments/:attachmentId/thumbnail
 * Menyajikan snapshot gambar thumbnail video
 */
export const getAttachmentThumbnail = async (req, res, next) => {
  try {
    const { object } = await attachmentService.getAttachmentThumbnail(
      req.params.id,
      req.params.attachmentId
    );

    res.setHeader("Content-Type", "image/webp");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache thumbnail 1 hari
    if (object.ContentLength) {
      res.setHeader("Content-Length", object.ContentLength);
    }

    pipeline(object.Body, res, (error) => {
      if (error) {
        console.error("[attachment] stream thumbnail gagal:", error.message);
        res.destroy();
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /tickets/:id/attachments/:attachmentId
 */
export const deleteAttachment = async (req, res, next) => {
  try {
    await attachmentService.deleteAttachment(req.params.id, req.params.attachmentId, req.user);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};
