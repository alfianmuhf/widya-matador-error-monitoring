import sharp from "sharp";
import createError from "http-errors";

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_PER_TICKET = 5;

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 82;
// Batas 50 MP: cukup untuk foto kamera, jauh di bawah default 268 MP (decompression bomb)
const MAX_INPUT_PIXELS = 50_000_000;

export const isSvg = (mimetype) => (mimetype || "").toLowerCase() === "image/svg+xml";

/**
 * Strip directories and control characters so the stored name can never
 * escape the attachment record.
 */
export const sanitizeFileName = (originalName = "") => {
  const base = String(originalName).split(/[\\/]/).pop() || "";
  const withoutExt = base.replace(/\.[^.]+$/, "");
  const safe = withoutExt
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 200);

  return `${safe || "gambar"}.webp`;
};

export const toWebp = async (buffer) => {
  try {
    const { data, info } = await sharp(buffer, {
      limitInputPixels: MAX_INPUT_PIXELS,
      failOn: "none",
    })
      // rotate() tanpa argumen mengikuti EXIF orientation, yang kemudian dibuang
      .rotate()
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    return { buffer: data, width: info.width, height: info.height, size: info.size };
  } catch {
    throw createError(400, "File bukan gambar yang valid");
  }
};
