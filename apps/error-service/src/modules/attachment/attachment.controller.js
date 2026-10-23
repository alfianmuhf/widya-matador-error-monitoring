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
    res.status(201).json({
      success: true,
      message: "Lampiran berhasil diunggah",
      data: { attachment },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tickets/:id/attachments/:attachmentId/content
 */
export const getAttachmentContent = async (req, res, next) => {
  try {
    const { row, object } = await attachmentService.getAttachmentObject(
      req.params.id,
      req.params.attachmentId
    );

    res.setHeader("Content-Type", row.mime_type);
    res.setHeader("Cache-Control", "private, max-age=300");
    if (object.ContentLength) {
      res.setHeader("Content-Length", object.ContentLength);
    }

    // pipeline menutup response bila stream storage error, bukan menggantung
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
