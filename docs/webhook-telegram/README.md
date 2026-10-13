# Kontrak Event Bus — Telegram Notifikasi via RabbitMQ

**Lokasi fisik:** `docs/webhook-telegram/`
**Sumber asli:** `openspec/changes/webhook-n8n-telegram/` (folder itu gitignored; salinan ter-track ada di sini).

---

## Topologi

```
error-service (publisher)
  → exchange `erad.events` (topic, durable)
  → queue `erad.telegram.notify` (durable, argumen x-dead-letter-exchange: erad.telegram.dlx)
  → DLQ `erad.telegram.notify.dlx`
  → RabbitMQ Trigger n8n
  → Bot API Telegram
```

- **Publisher** (`apps/error-service/src/modules/webhook/webhook.publisher.js`):
  - Konfirmasi channel (`confirmChannel`), pesan `persistent`, `deliveryId` uuid per pesan
  - Publish ke exchange `erad.events` dengan routing key sesuai event type
  - **Fire-and-forget**: jika gagal, operasi asli tetap sukses, kegagalan dicatat audit log (`action: ERROR`, `entityType: Webhook`)
  - Jika `RABBITMQ_URL` kosong: publish dilewati + warning (sistem tetap jalan)
- **Queue** `erad.telegram.notify`: durable, ter-bind ke `erad.events` dengan `#`, argumen `x-dead-letter-exchange: erad.telegram.dlx`
- **DLX** `erad.telegram.dlx`: mengarahkan pesan poison ke DLQ `erad.telegram.notify.dlx`
- **n8n** menarik dari queue `erad.telegram.notify`, ack setelah eksekusi sukses

---

## Env

| Variabel | Default | Catatan |
|---|---|---|
| `RABBITMQ_URL` | `amqp://localhost:5672` | Kosongkan untuk mode dev tanpa notifikasi (publish dilewati + warning) |
| `RABBITMQ_EXCHANGE` | `erad.events` | Digunakan oleh publisher sebagai exchange default |

Contoh di `.env.backend.example`:
```
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_EXCHANGE=erad.events
```

Letak: `.env.backend` (di `apps/error-service/.env` dari `.env.backend.example`).

---

## Kontrak 4 Routing Key

Payload persis seperti yang dipublish kode (baca `webhook.publisher.js`, `user.service.js`, `ticket-assignee.service.js`, `auth.service.js` — jangan mengarang). Umum:

```json
{
  "deliveryId": "<uuid>",
  "event": "<routingKey>",
  "occurredAt": "<ISO8601>",
  ...payload
}
```

Per event:

### `user.invited`

```json
{
  "deliveryId": "uuid",
  "event": "user.invited",
  "occurredAt": "2026-01-15T03:25:30.123Z",
  "actor": { "id": "...", "email": "...", "name": "..." },
  "data": {
    "user": {
      "id": "usr_...",
      "email": "user@example.com",
      "name": "Nama Lengkap",
      "role": "viewer",
      "division": "after_sales",
      "status": "invited"
    },
    "telegram": {
      "telegramId": "123456789",
      "username": "namauser",
      "whitelisted": true
    }
  }
}
```

- **Routing**: DM ke `data.telegram.telegramId` bila ada, else fallback grup admin.

### `ticket.claimed`

```json
{
  "deliveryId": "uuid",
  "event": "ticket.claimed",
  "occurredAt": "2026-01-15T03:25:30.123Z",
  "actor": { "userId": "...", "telegramId": "...", "name": "..." },
  "data": {
    "ticketId": "tk_...",
    "claimer": {
      "name": "...",
      "userId": "...",
      "telegramId": "..."
    },
    "group": { "chatId": "123456789", "clientId": "cli_...", "locationId": "loc_..." }
  }
}
```

- **Routing**: Grup `data.group.chatId` (resolusi client+location → location → client; `chatId` bisa `null` bila tidak ada grup yang cocok) → fallback grup admin.

### `ticket.member_added`

```json
{
  "deliveryId": "uuid",
  "event": "ticket.member_added",
  "occurredAt": "2026-01-15T03:25:30.123Z",
  "actor": { "userId": "...", "telegramId": "...", "name": "..." },
  "data": {
    "ticketId": "tk_...",
    "addedBy": "...",
    "addedMember": {
      "name": "Nama Anggota",
      "userId": "usr_...",
      "telegram": { "telegramId": "987654321", "username": "anggota" }
    }
  }
}
```

- **Routing**: DM `data.addedMember.telegram.telegramId` saja; **tanpa telegram** → TANPA pesan (bukan grup).

### `otp.password_reset`

```json
{
  "deliveryId": "uuid",
  "event": "otp.password_reset",
  "occurredAt": "2026-01-15T03:25:30.123Z",
  "data": {
    "telegram": { "telegramId": "123456789", "username": "namauser" },
    "otp": "123456",
    "expiresInMinutes": 5
  }
}
```

- **Routing**: DM `data.telegram.telegramId`, berisi OTP 6 digit + `expiresInMinutes`.
- **Catatan keamanan**: OTP dikirim sekali lewat bus; disimpan di memori proses.

---

## Semantik Pengiriman

- **Dedup**: `deliveryId` di n8n (static data, batas 500). Jika `deliveryId` sudah dilihat, pesan diabaikan.
- **Nack**: Pada eksekusi gagal → pesan di-nack → masuk DLQ (`erad.telegram.notify.dlx`) dan bisa direqueue manual via management UI `localhost:15672`.
- **Fire-and-forget**: Publisher tidak menunggu ack dari consumer; hanya menunggu konfirmasi broker (`waitForConfirms`). Jika broker gagal mengkonfirmasi, dicek ulang dan dicatat audit log.

---

## Link Referensi

- `n8n-setup.md` — import workflow dan konfigurasi credential
- `../../infra/README.md` — jalankan RabbitMQ (`docker compose up -d rabbitmq` dari `infra/`)
- `../api.md` — endpoint HTTP: forgot/reset-password & POST /users