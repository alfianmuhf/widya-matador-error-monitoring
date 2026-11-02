# Setup n8n — notifikasi Telegram via RabbitMQ

Workflow importable: `n8n-workflow.json` (di folder ini).

## Langkah

1. Buka n8n → **Workflows → Import from File** → pilih `n8n-workflow.json`.
2. Buat 2 credentials:
   - **RabbitMQ** (`rabbitmq`): host `localhost`, port `5672`, user/pass default `guest`/`guest`
     (atau sesuai `RABBITMQ_URL` di `.env.backend`).
   - **Telegram Bot** (`telegramApi`): token dari @BotFather.
3. Di node **Route: User Invited**, **Route: Ticket Escalated**, ganti `REPLACE_WITH_SOFTWARE_GROUP_CHAT_ID` dengan chat ID grup software
   (fallback saat target DM/grup tidak ada).
4. **Activate** workflow, lalu pastikan RabbitMQ jalan: `docker compose up -d rabbitmq`
   (dari folder `infra/`) dan set `RABBITMQ_URL=amqp://localhost:5672` di `.env.backend`.

## Workflow Unggahan Ingest (Telegram → BE)

Workflow pertama di atas adalah **konsumen** bus. Jalur unggahan **balik arah** (n8n mengunggah media dari
chat Telegram ke backend) sepertinya workflow kedua yang belum ada di `n8n-workflow.json` — dibangun dengan:

1. **Trigger**: Telegram Trigger (`message: photo | video`), atau queue worker pathway.
2. **Get File**: Telegram node unduh media (note Bot API `getFile` maks 20 MB — set `TELEGRAM_MAX_VIDEO_MB` cocok).
3. **HTTP Request → `POST /api/telegram/attachments`**:
   - Header `X-API-Key` dari credential teks (jangan plaintext di node).
   - Header `Idempotency-Key: {{ $json.message_id }}` — retry aman.
   - Body Form Data: `file` (binary), `ticket_id` (mapping caption `/ticket <ref>`), `telegram_user_id: {{ $json.from.id }}`, `chat_id: {{ $json.chat.id }}`.
4. **Consumer event balik-status**: flow kedua konsumen RabbitMQ yang juga menangkap routing key `attachment.video_ready` dan
   `attachment.video_failed` (payload `data.chatId`, `data.attachmentId`, `data.errorSummary`) → balas chat asal.
5. **Retry policy**: `200` dengan `replayed: true` + `status: PENDING/PROCESSING` → tunggu event; `409` pada replay row
   `failed` → kirim ulang dengan `Idempotency-Key` baru.

## Perilaku

- Queue `erad.telegram.notify`, ack **Execution Finishes Successfully** — bila eksekusi gagal,
  pesan di-nack → masuk DLQ (`erad.telegram.notify.dlx`, sudah di-assert publisher) dan bisa
  di-requeue manual dari management UI (`localhost:15672`).
- Dedup `deliveryId` via workflow static data (batas 500 id terakhir). Catatan n8n: static data
  tidak tersimpan saat *test run* — dedup efektif setelah workflow aktif (mode produksi).
- Routing per event:
  - `user.invited` → DM `data.telegram.telegramId`, fallback grup software bila null.
  - `ticket.escalated` → grup `data.group.chatId`, fallback grup software bila null.
  - `ticket.leader_changed` (transfer) → DM ke old leader + new leader; `added_as_leader` → DM ke new leader saja.
  - `ticket.member_added` → DM `data.addedMember.telegram.telegramId` saja; tanpa telegram → tidak ada pesan.
  - `ticket.member_removed` → DM ke removed member + current leader.
  - `otp.password_reset` → DM `data.telegram.telegramId` berisi OTP 6 digit.
  - `attachment.video_ready` → balas chat asal `data.chatId` "video siap diputar" (jalur ingest unggahan).
  - `attachment.video_failed` → balas chat asal `data.chatId` + `data.errorSummary` ringkas.