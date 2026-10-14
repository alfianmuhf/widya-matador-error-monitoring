# Setup n8n — notifikasi Telegram via RabbitMQ

Workflow importable: `n8n-workflow.json` (di folder ini).

## Langkah

1. Buka n8n → **Workflows → Import from File** → pilih `n8n-workflow.json`.
2. Buat 2 credentials:
   - **RabbitMQ** (`rabbitmq`): host `localhost`, port `5672`, user/pass default `guest`/`guest`
     (atau sesuai `RABBITMQ_URL` di `.env.backend`).
   - **Telegram Bot** (`telegramApi`): token dari @BotFather.
3. Di node **Dedup + Route**, ganti `REPLACE_WITH_ADMIN_GROUP_CHAT_ID` dengan chat ID grup admin
   (fallback saat target DM/grup tidak ada).
4. **Activate** workflow, lalu pastikan RabbitMQ jalan: `docker compose up -d rabbitmq`
   (dari folder `infra/`) dan set `RABBITMQ_URL=amqp://localhost:5672` di `.env.backend`.

## Perilaku

- Queue `erad.telegram.notify`, ack **Execution Finishes Successfully** — bila eksekusi gagal,
  pesan di-nack → masuk DLQ (`erad.telegram.notify.dlx`, sudah di-assert publisher) dan bisa
  di-requeue manual dari management UI (`localhost:15672`).
- Dedup `deliveryId` via workflow static data (batas 500 id terakhir).
  **Penting**: Static data (`$getWorkflowStaticData`) **tidak persist saat *test run*** (tombol "Execute Workflow").
  Dedup hanya efektif setelah workflow **diaktifkan (Activate)**. Saat test mode, pesan bisa terkirim dobel 1x — ini normal.
- Routing per event:
  - `user.invited` → DM `data.telegram.telegramId`, fallback grup admin bila null.
  - `ticket.claimed` → grup `data.group.chatId`, fallback grup admin bila null.
  - `ticket.member_added` → DM `data.addedMember.telegram.telegramId` saja; tanpa telegram → tidak ada pesan.
  - `otp.password_reset` → DM `data.telegram.telegramId` berisi OTP 6 digit.
