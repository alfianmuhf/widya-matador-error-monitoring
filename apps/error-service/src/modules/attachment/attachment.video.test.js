import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
  MAX_VIDEO_SIZE,
  MAX_VIDEO_DURATION,
  MAX_VIDEOS_PER_TICKET,
  MAX_IMAGES_PER_TICKET,
  VIDEO_STAGING_DIR,
  safeUnlink,
  resolveResolutionWidth,
  getVideoTranscodeConfig,
} from "./attachment.video.js";
import { formatAttachment } from "./attachment.service.js";

test("video specifications and constants are strictly defined", () => {
  assert.equal(MAX_VIDEO_SIZE, 350 * 1024 * 1024, "Max video size should be 350 MB");
  assert.equal(MAX_VIDEO_DURATION, 120, "Max video duration should be 120 seconds (2 minutes)");
  assert.equal(MAX_VIDEOS_PER_TICKET, 5, "Max videos per ticket should be 5");
  assert.equal(MAX_IMAGES_PER_TICKET, 5, "Max images per ticket should be 5");
  assert.ok(VIDEO_STAGING_DIR, "Staging directory should be defined");
});

test("resolveResolutionWidth parses resolution strings and numbers correctly", () => {
  assert.equal(resolveResolutionWidth("1080p"), 1920);
  assert.equal(resolveResolutionWidth("1080"), 1920);
  assert.equal(resolveResolutionWidth("720p"), 1280);
  assert.equal(resolveResolutionWidth("720"), 1280);
  assert.equal(resolveResolutionWidth("480p"), 854);
  assert.equal(resolveResolutionWidth("360p"), 640);
  assert.equal(resolveResolutionWidth("4k"), 3840);
  assert.equal(resolveResolutionWidth("2160p"), 3840);
  assert.equal(resolveResolutionWidth(1280), 1280);
  assert.equal(resolveResolutionWidth("1920"), 1920);
  assert.equal(resolveResolutionWidth(null), 1920);
  assert.equal(resolveResolutionWidth("invalid"), 1920);
});

test("getVideoTranscodeConfig provides defaults and reads env values", () => {
  const config = getVideoTranscodeConfig();
  assert.ok(typeof config.crf === "number");
  assert.ok(config.crf >= 0 && config.crf <= 51);
  assert.ok(typeof config.maxWidth === "number");
  assert.ok(config.maxWidth > 0);
});

test("safeUnlink safely handles existing and non-existing files", async () => {
  // Non-existing file must not throw
  await assert.doesNotReject(() => safeUnlink("/non/existent/path/test.raw"));

  // Existing file is cleanly unlinked
  const tempFile = path.join(VIDEO_STAGING_DIR, `test-unlink-${Date.now()}.raw`);
  await fs.writeFile(tempFile, "temp content");
  assert.ok(await fs.stat(tempFile).then(() => true).catch(() => false));

  await safeUnlink(tempFile);
  assert.equal(await fs.stat(tempFile).then(() => true).catch(() => false), false);
});

test("formatAttachment outputs unified video and image metadata", () => {
  const mockVideo = {
    id: "6f1c2b7e-1f0a-4a4e-9a4e-2f6d1c9b7a11",
    ticket_id: "ERR-20261102-0001",
    file_type: "video",
    file_name: "bukti-error.mp4",
    mime_type: "video/mp4",
    file_size: 15420000,
    status: "ready",
    duration: 75.4,
    thumbnail_url: "tickets/ERR-20261102-0001/6f1c2b7e-1f0a-4a4e-9a4e-2f6d1c9b7a11-thumb.webp",
    error_message: null,
    uploaded_at: new Date("2026-11-02T00:00:00Z"),
    uploaded_by_user: {
      id: "usr-1",
      name: "Budi",
      username: "budi@example.com",
    },
  };

  const formatted = formatAttachment(mockVideo);

  assert.equal(formatted.id, mockVideo.id);
  assert.equal(formatted.fileType, "VIDEO");
  assert.equal(formatted.status, "READY");
  assert.equal(formatted.url, "/tickets/ERR-20261102-0001/attachments/6f1c2b7e-1f0a-4a4e-9a4e-2f6d1c9b7a11/content");
  assert.equal(formatted.thumbnailUrl, "/tickets/ERR-20261102-0001/attachments/6f1c2b7e-1f0a-4a4e-9a4e-2f6d1c9b7a11/thumbnail");
  assert.equal(formatted.duration, 75.4);
  assert.equal(formatted.size, 15420000);
});

test("formatAttachment handles pending video without thumbnail and file_url", () => {
  const pendingVideo = {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    ticket_id: "ERR-20261102-0002",
    file_type: "video",
    file_name: "uploading-video.mp4",
    mime_type: "video/mp4",
    file_size: 45000000,
    status: "pending",
    duration: null,
    thumbnail_url: null,
    error_message: null,
    uploaded_at: new Date("2026-11-02T00:00:00Z"),
  };

  const formatted = formatAttachment(pendingVideo);

  assert.equal(formatted.fileType, "VIDEO");
  assert.equal(formatted.status, "PENDING");
  assert.equal(formatted.thumbnailUrl, null);
  assert.equal(formatted.duration, null);
});
