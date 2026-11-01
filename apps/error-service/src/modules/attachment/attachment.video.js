import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import os from "node:os";

export const MAX_VIDEO_SIZE = 350 * 1024 * 1024; // 350 MB
export const MAX_VIDEO_DURATION = 120; // 120 detik (2 menit)
export const MAX_VIDEOS_PER_TICKET = 5;
export const MAX_IMAGES_PER_TICKET = 5;

export const VIDEO_STAGING_DIR =
  process.env.VIDEO_STAGING_DIR ||
  (process.platform === "win32"
    ? path.join(os.tmpdir(), "after-sales-video-staging")
    : "/tmp/video-staging");

// Pastikan direktori staging sementara ada
if (!fsSync.existsSync(VIDEO_STAGING_DIR)) {
  fsSync.mkdirSync(VIDEO_STAGING_DIR, { recursive: true, mode: 0o700 });
}

/**
 * Hapus file sementara dengan aman (tidak melempar error jika file tidak ada)
 */
export const safeUnlink = async (filePath) => {
  if (!filePath) return;
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.warn(`[attachment.video] Gagal menghapus file temp (${filePath}):`, err.message);
    }
  }
};

/**
 * Validasi dan ekstraksi metadata menggunakan FFprobe
 */
export const inspectVideoWithFfprobe = (inputPath) => {
  return new Promise((resolve, reject) => {
    const ffprobeBinary = process.env.FFPROBE_PATH || "ffprobe";
    const args = [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=codec_name,width,height,duration:format=duration,size,format_name",
      "-of", "json",
      inputPath,
    ];

    const child = spawn(ffprobeBinary, args);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (err) => {
      reject(new Error(`ffprobe gagal dijalankan: ${err.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(`Validasi ffprobe gagal: File tidak valid atau rusak (${stderr.trim() || `exit code ${code}`})`)
        );
      }

      try {
        const metadata = JSON.parse(stdout);
        const videoStream = metadata.streams?.[0];
        if (!videoStream) {
          return reject(new Error("File tidak memiliki stream video yang valid"));
        }

        const duration = parseFloat(videoStream.duration || metadata.format?.duration || "0");
        if (!duration || isNaN(duration) || duration <= 0) {
          return reject(new Error("Durasi video tidak terdeteksi atau bernilai 0"));
        }

        if (duration > MAX_VIDEO_DURATION) {
          return reject(
            new Error(
              `Durasi video (${Math.round(duration)} detik) melebihi batas maksimal ${MAX_VIDEO_DURATION} detik (2 menit)`
            )
          );
        }

        resolve({
          duration,
          width: videoStream.width || null,
          height: videoStream.height || null,
          codec: videoStream.codec_name || "unknown",
          format: metadata.format?.format_name || "unknown",
        });
      } catch (parseError) {
        reject(new Error(`Gagal mem-parsing metadata ffprobe: ${parseError.message}`));
      }
    });
  });
};

/**
 * Transkoding video ke MP4 H.264 1080p CRF 28 + generate Thumbnail WebP
 */
export const transcodeVideoWithFfmpeg = (inputPath, outputVideoPath, outputThumbPath, duration = 10) => {
  return new Promise((resolve, reject) => {
    const ffmpegBinary = process.env.FFMPEG_PATH || "ffmpeg";

    // Jika durasi < 1 detik, ambil snapshot di detik 00:00:00
    const snapshotTime = duration < 1 ? "00:00:00" : "00:00:01";

    const args = [
      "-nostdin",
      "-protocol_whitelist", "file,crypto,data",
      "-i", inputPath,
      // Output 1: MP4 terkompresi H.264 1080p
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "28",
      "-vf", "scale='min(1920,iw)':-2",
      "-c:a", "aac",
      "-b:a", "128k",
      "-movflags", "+faststart",
      "-y", outputVideoPath,
      // Output 2: Thumbnail WebP
      "-ss", snapshotTime,
      "-vframes", "1",
      "-vf", "scale='min(640,iw)':-2",
      "-y", outputThumbPath,
    ];

    const child = spawn(ffmpegBinary, args);
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    child.on("error", (err) => {
      reject(new Error(`ffmpeg gagal dijalankan: ${err.message}`));
    });

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(`Konversi ffmpeg gagal: ${stderr.slice(-500).trim() || `exit code ${code}`}`)
        );
      }
      resolve({ outputVideoPath, outputThumbPath });
    });
  });
};

