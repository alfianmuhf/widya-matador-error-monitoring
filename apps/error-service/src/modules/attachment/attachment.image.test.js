import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { isSvg, sanitizeFileName, toWebp } from "./attachment.image.js";

test("portrait photo with EXIF orientation 6 is stored upright", async () => {
  const input = await sharp({
    create: { width: 100, height: 200, channels: 3, background: "#336699" },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();

  const output = await toWebp(input);
  const meta = await sharp(output.buffer).metadata();

  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 200);
  assert.equal(meta.height, 100);
});

test("oversized image is downscaled to 1920 on the longest side", async () => {
  const input = await sharp({
    create: { width: 4000, height: 3000, channels: 3, background: "#888888" },
  })
    .png()
    .toBuffer();

  const output = await toWebp(input);
  const meta = await sharp(output.buffer).metadata();

  assert.equal(meta.width, 1920);
  assert.equal(meta.height, 1440);
});

test("small image is not upscaled", async () => {
  const input = await sharp({
    create: { width: 300, height: 200, channels: 3, background: "#444444" },
  })
    .png()
    .toBuffer();

  const output = await toWebp(input);
  const meta = await sharp(output.buffer).metadata();

  assert.equal(meta.width, 300);
  assert.equal(meta.height, 200);
});

test("non-image buffer is rejected", async () => {
  await assert.rejects(() => toWebp(Buffer.from("this is not an image")), /bukan gambar/);
});

test("svg is rejected before conversion", () => {
  assert.equal(isSvg("image/svg+xml"), true);
  assert.equal(isSvg("IMAGE/SVG+XML"), true);
  assert.equal(isSvg("image/png"), false);
});

test("filename keeps only a safe basename", () => {
  assert.equal(sanitizeFileName("../../etc/passwd"), "passwd.webp");
  assert.equal(sanitizeFileName("foto\r\nX.png"), "fotoX.webp");
  assert.equal(sanitizeFileName(""), "gambar.webp");
});
