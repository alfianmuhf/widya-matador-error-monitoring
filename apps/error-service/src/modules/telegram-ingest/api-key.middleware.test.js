import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { env } from "../../config/env.js";

// env.js memparse process.env saat import — set langsung pada hasil parse agar
// modul middleware membaca slot aktif/previous yang konsisten dalam test ini.
env.TELEGRAM_API_KEY = "a".repeat(32);
env.TELEGRAM_API_KEY_PREVIOUS = "b".repeat(32);

import { requireApiKey } from "./api-key.middleware.js";

/**
 * Middleware dieksekusi penuh lewat server http nyata (pola supertest tanpa dependensi tambahan),
 * supaya perilaku next()/res.status/next(createError) sama seperti di router.
 */
const run = (headers, handler = requireApiKey) =>
  new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // Shims minimal perilaku Express yang dipakai middleware (req.get)
      req.get = (name) => req.headers[String(name).toLowerCase()];
      handler(req, res, (err) => {
        if (err) {
          res.statusCode = err.status || 500;
          res.end(JSON.stringify({ status: err.status || 500, message: err.message }));
          return;
        }
        res.statusCode = 200;
        res.end("next");
      });
    });
    // unref: objek server sisa (race close) tidak memegang event loop runner
    server.unref();
    server.listen(0, async () => {
      const port = server.address().port;
      try {
        const res = await fetch(`http://127.0.0.1:${port}`, { headers, method: "POST" });
        const raw = await res.text(); // baca body sekali (json/user-text), hindari dobel-konsumsi
        let body = raw;
        try {
          body = JSON.parse(raw);
        } catch {
          /* teks pola "next" tidak berupa JSON */
        }
        resolve({ status: res.status, body });
      } finally {
        server.closeAllConnections(); // fetch undici memegang keep-alive → close hang jika tidak diputus
        server.close();
      }
    });
  });

test("key di log hanya 4 karakter terakhir, bukan nilai penuh", async () => {
  const logs = [];
  const orig = console.warn;
  console.warn = (...args) => logs.push(args.join(" "));
  try {
    const secret = "c".repeat(28) + "acker";
    const result = await run({ "X-API-Key": secret });
    assert.equal(result.status, 401);
    assert.equal(logs.some((l) => l.includes(secret)), false, "key penuh tidak boleh muncul di log");
    assert.equal(logs.some((l) => l.includes(`...${secret.slice(-4)}`)), true, "log mencatat akhir key");
  } finally {
    console.warn = orig;
  }
});

test("key benar → next()", async () => {
  const result = await run({ "X-API-Key": "a".repeat(32) });
  assert.equal(result.status, 200);
  assert.equal(result.body, "next");
});

test("key PREVIOUS → next() (slot rotasi)", async () => {
  const result = await run({ "X-API-Key": "b".repeat(32) });
  assert.equal(result.status, 200);
});

test("key salah → 401", async () => {
  const result = await run({ "X-API-Key": "x".repeat(40) });
  assert.equal(result.status, 401);
  assert.equal(result.body.status, 401);
});

test("header hilang → 401", async () => {
  const result = await run({});
  assert.equal(result.status, 401);
});

test("tanpa konfigurasi TELEGRAM_API_KEY → 503 feature-disabled", async () => {
  const saved = env.TELEGRAM_API_KEY;
  delete env.TELEGRAM_API_KEY;
  try {
    const result = await run({ "X-API-Key": "a".repeat(32) });
    assert.equal(result.status, 503);
  } finally {
    env.TELEGRAM_API_KEY = saved;
  }
});
