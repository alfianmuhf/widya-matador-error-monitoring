import test from "node:test";
import assert from "node:assert/strict";
import { ingestBodySchema, parseIdempotencyKey } from "./schema.js";

test("body valid: telegram_user_id saja, tanpa chat_id", () => {
  const parsed = ingestBodySchema.parse({ ticket_id: "TKT-01", telegram_user_id: "1234567890" });
  assert.equal(parsed.ticket_id, "TKT-01");
  assert.equal(parsed.telegram_user_id, "1234567890");
  assert.equal(parsed.telegram_username, undefined);
  assert.equal(parsed.chat_id, undefined);
});

test("body valid: telegram_username saja (chat_id juga bisa, negatif group)", () => {
  const parsed = ingestBodySchema.parse({
    ticket_id: "TKT-01",
    telegram_username: "mahasiswa",
    chat_id: "-1001234567890",
  });
  assert.equal(parsed.telegram_user_id, undefined);
  assert.equal(parsed.telegram_username, "mahasiswa");
  assert.equal(parsed.chat_id, "-1001234567890");
});

test("tanpa identitas → ditolak", () => {
  assert.throws(() => ingestBodySchema.parse({ ticket_id: "TKT-01" }));
});

test("telegram_user_id non-angka → ditolak", () => {
  assert.throws(() => ingestBodySchema.parse({ ticket_id: "T", telegram_user_id: "abc" }));
});

test("ticket_id kosong → ditolak", () => {
  assert.throws(() => ingestBodySchema.parse({ ticket_id: " ", telegram_username: "u" }));
});

test("parseIdempotencyKey: kosong → null; >64 char → 400", () => {
  assert.equal(parseIdempotencyKey(""), null);
  assert.equal(parseIdempotencyKey("   "), null);
  assert.equal(parseIdempotencyKey("12345"), "12345"); // Telegram message_id
  assert.throws(() => parseIdempotencyKey("x".repeat(65)));
});
