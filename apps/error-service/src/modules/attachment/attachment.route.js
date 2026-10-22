import { Router } from "express";
import multer from "multer";
import createError from "http-errors";
import * as attachmentController from "./attachment.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { MAX_FILE_SIZE } from "./attachment.image.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

const handleUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();

    if (error.code === "LIMIT_FILE_SIZE") {
      return next(createError(413, "Ukuran gambar maksimal 5 MB"));
    }

    return next(createError(400, "Gagal membaca file yang diunggah"));
  });
};

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get("/", attachmentController.listAttachments);
router.post("/", handleUpload, attachmentController.uploadAttachment);
router.get("/:attachmentId/content", attachmentController.getAttachmentContent);
router.delete("/:attachmentId", attachmentController.deleteAttachment);

export default router;
