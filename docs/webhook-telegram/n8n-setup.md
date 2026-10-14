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