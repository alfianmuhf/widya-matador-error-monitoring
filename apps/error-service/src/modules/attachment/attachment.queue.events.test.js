import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(dir, "attachment.queue.js"), "utf8");

// Kontrak event: guard statis untuk konstanta yang tidak bisa diuji runtime
// tanpa Redis + PostgreSQL (uji integrasi berjalan bersama stack compose).

test("worker mempublish kontrak event video di erad.events", () => {
  assert.ok(src.includes('publishWebhook("attachment.video_ready"'), "event video_ready ada di worker");
  assert.ok(src.includes('publishWebhook("attachment.video_failed"'), "event video_failed ada di worker");
  assert.ok(src.includes("data: {"), "payload diwrap key 'data' mengikuti konvensi envelope");
  for (const field of ["ticketId", "attachmentId", "chatId", "errorSummary"]) {
    assert.ok(src.includes(field), `payload memuat ${field}`);
  }
});

test("semantik percobaan worker: attempts 1 (raw dihapus di finally → retry kedua pasti ENOENT)", () => {
  assert.ok(src.includes("attempts: 1"), "attempts harus 1");
  assert.ok(!src.includes("attempts: 2"), "attempts 2 tidak boleh kembali");
});
