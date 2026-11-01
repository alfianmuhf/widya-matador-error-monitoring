import { Queue, Worker } from "bullmq";
import fs from "node:fs/promises";
import path from "node:path";
import prisma from "../../config/prisma.js";
import { queueRedisOptions } from "../../config/queue-redis.js";
import { recordLog } from "../audit-log/audit-log.service.js";
import * as storage from "./attachment.storage.js";
import {
  VIDEO_STAGING_DIR,
  inspectVideoWithFfprobe,
  transcodeVideoWithFfmpeg,
  safeUnlink,
} from "./attachment.video.js";

export const QUEUE_NAME = "video-transcoding";

let _queue = null;

/**
 * Mendapatkan instance Queue BullMQ secara lazy
 */
export const getVideoTranscodeQueue = () => {
  if (!_queue) {
    _queue = new Queue(QUEUE_NAME, {
      connection: queueRedisOptions,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return _queue;
};

/**
 * Worker processor untuk mengeksekusi konversi video di latar belakang
 */
export const createVideoWorker = () => {
  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { attachmentId, ticketId, rawFilePath, originalFileName, actor } = job.data;
      console.log(`[Queue Worker] Mulai memproses video job #${job.id} (attachment: ${attachmentId})`);

      const outputVideoPath = path.join(VIDEO_STAGING_DIR, `${attachmentId}.mp4`);
      const outputThumbPath = path.join(VIDEO_STAGING_DIR, `${attachmentId}-thumb.webp`);

      try {
        // 1. Update status di DB menjadi processing
        await prisma.ticket_attachments.update({
          where: { id: attachmentId },
          data: { status: "processing" },
        });

        // 2. Validasi file via ffprobe sebelum FFmpeg
        const meta = await inspectVideoWithFfprobe(rawFilePath);
        console.log(`[Queue Worker] ffprobe valid (${attachmentId}): ${meta.duration}s, ${meta.width}x${meta.height}, ${meta.codec}`);

        // 3. Transcode video ke MP4 1080p CRF 28 & generate thumbnail WebP
        await transcodeVideoWithFfmpeg(rawFilePath, outputVideoPath, outputThumbPath, meta.duration);

        // 4. Baca file hasil konversi
        const [videoBuffer, thumbBuffer] = await Promise.all([
          fs.readFile(outputVideoPath),
          fs.readFile(outputThumbPath),
        ]);

        const videoKey = `tickets/${ticketId}/${attachmentId}.mp4`;
        const thumbKey = `tickets/${ticketId}/${attachmentId}-thumb.webp`;

        // 5. Unggah ke Object Storage (RustFS S3)
        await storage.putObject(videoKey, videoBuffer, "video/mp4");
        await storage.putObject(thumbKey, thumbBuffer, "image/webp");

        // 6. Update database status READY
        await prisma.ticket_attachments.update({
          where: { id: attachmentId },
          data: {
            status: "ready",
            file_url: videoKey,
            thumbnail_url: thumbKey,
            file_size: videoBuffer.length,
            duration: meta.duration,
            error_message: null,
          },
        });

        // 7. Catat audit log sukses
        if (actor) {
          await recordLog({
            actor: actor.username || actor.name || actor.email || "Sistem",
            action: "UPDATE",
            entity: "TICKET",
            entity_id: ticketId,
            description: `Video lampiran '${originalFileName}' berhasil dikonversi dan siap diputar`,
          }).catch((err) => console.warn("[Queue Worker] Gagal mencatat audit log:", err.message));
        }

        console.log(`[Queue Worker] Video #${attachmentId} sukses dikonversi dan diunggah (${videoBuffer.length} bytes)`);
        return { success: true, attachmentId, key: videoKey };
      } catch (error) {
        console.error(`[Queue Worker] Gagal memproses video #${attachmentId}:`, error.message);

        // Update database status FAILED
        await prisma.ticket_attachments.update({
          where: { id: attachmentId },
          data: {
            status: "failed",
            error_message: error.message.slice(0, 500),
          },
        }).catch((dbErr) => console.error("[Queue Worker] Gagal update status failed di DB:", dbErr.message));

        throw error;
      } finally {
        // 8. Selalu bersihkan file sementara di disk BE (Zero garbage guarantee)
        await Promise.all([
          safeUnlink(rawFilePath),
          safeUnlink(outputVideoPath),
          safeUnlink(outputThumbPath),
        ]);
      }
    },
    {
      connection: queueRedisOptions,
      concurrency: 1, // 1 proses video dalam 1 waktu untuk menjaga kestabilan CPU
    }
  );

  worker.on("failed", (job, err) => {
    console.warn(`[Queue Worker] Job #${job?.id} gagal: ${err.message}`);
  });

  worker.on("error", (err) => {
    console.warn(`[Queue Worker] Worker error: ${err.message}`);
  });

  return worker;
};
