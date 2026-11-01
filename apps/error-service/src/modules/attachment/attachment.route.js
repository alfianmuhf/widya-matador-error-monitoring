import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import createError from "http-errors";
import * as attachmentController from "./attachment.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { MAX_VIDEO_SIZE, VIDEO_STAGING_DIR } from "./attachment.video.js";

/**
 * Storage disk sementara dengan penamaan UUID acak (.raw)
 * Mencegah eksekusi file berbahaya / webshell
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, VIDEO_STAGING_DIR);
  },
  filename: (req, file, cb) => {
    // Selalu simpan dengan UUID v4 murni (.raw), nama asli dari user tidak disentuh di disk
    cb(null, `${randomUUID()}.raw`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_VIDEO_SIZE, // 350 MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const mimetype = (file.mimetype || "").toLowerCase();
    const ext = path.extname(file.originalname).toLowerCase();

    // Blokir SVG secara dini
    if (mimetype === "image/svg+xml" || ext === ".svg") {
      return cb(createError(400, "Format SVG tidak diperbolehkan"));
    }

    const isImage = mimetype.startsWith("image/") || /\.(jpe?g|png|webp|gif|bmp)$/i.test(ext);
    const isVideo = mimetype.startsWith("video/") || /\.(mp4|mov|mkv|avi|webm)$/i.test(ext);

    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(createError(400, "Format file tidak didukung. Hanya gambar dan video yang diperbolehkan"));
    }
  },
});

const handleUpload = (req, res, next) => {
  upload.single("file")(req, res, (error) => {
    if (!error) return next();

    if (error.code === "LIMIT_FILE_SIZE") {
      return next(createError(413, "Ukuran file maksimal 350 MB untuk video (dan 5 MB untuk foto)"));
    }

    return next(error.statusCode ? error : createError(400, "Gagal membaca file yang diunggah"));
  });
};

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get("/", attachmentController.listAttachments);
router.post("/", handleUpload, attachmentController.uploadAttachment);
router.get("/:attachmentId/content", attachmentController.getAttachmentContent);
router.get("/:attachmentId/thumbnail", attachmentController.getAttachmentThumbnail);
router.delete("/:attachmentId", attachmentController.deleteAttachment);

export default router;
