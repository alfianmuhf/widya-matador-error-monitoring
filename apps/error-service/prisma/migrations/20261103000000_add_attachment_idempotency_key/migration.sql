-- Menambahkan dukungan idempotency unggahan via endpoint ingest n8n (telegram-upload-ingest).
-- Kolom NULL: baris unggahan frontend biasa tidak saling bentrok pada unique index (PostgreSQL).

ALTER TABLE "ticket_attachments"
  ADD COLUMN "idempotency_key" VARCHAR(64);

CREATE UNIQUE INDEX "ticket_attachments_ticket_id_idempotency_key_key"
  ON "ticket_attachments"("ticket_id", "idempotency_key");
