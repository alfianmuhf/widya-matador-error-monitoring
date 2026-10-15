# Infra — Runbook Setup

Layanan di `infra/docker-compose.yml` dan konfigurasi terkait.

## Layanan

| Layanan | Detail |
|---|---|
| **backend** | Dibangun dari `Dockerfile` di `apps/error-service`. `network_mode: host`, `depends_on: [rabbitmq]` |
| **frontend** | Development server, port **5173** |
| **rabbitmq** | `rabbitmq:4-management`. Port: 5672 (AMQP) + 15672 (Management UI). Kredensial default: `guest`/`guest` |

## Cara Menjalankan

1. Pastikan file `.env` diletakkan pada folder `env-file` di luar repo:
   - `aidev/dev/env-file/.env.backend` (salin dari `.env.backend.example`)
   - `aidev/dev/env-file/.env.frontend` (salin dari `.env.frontend.example`)
2. Tanpa `RABBITMQ_URL` di `.env` Backend → notifikasi Telegram mati tapi sistem tetap jalan (publish dilewati + warning).
3. Dari direktori `infra/`:
   ```bash
   # Jalankan semua service sekaligus (backend, frontend, rabbitmq)
   docker compose --env-file ../../env-file/.env.frontend up -d --build
   ```
   - Atau cukup `docker compose up -d rabbitmq` hanya untuk menyiapkan RabbitMQ saja.

## Catatan Penting

- `network_mode: host`:
  - Berjalan mulus di **Linux** — RabbitMQ terakses langsung via `localhost:5672`.
  - Di **Windows/Mac** Docker Desktop perilakunya berbeda — RabbitMQ tetap diakses melalui port mapping (`5672` dan `15672`), bukan host network langsung.
- **RabbitMQ tanpa volume**:
  - Tidak ada volume persistent untuk queue/DLQ. Saat container direcreate, data queue/DLQ hilang.
  - Publisher otomatis *re-assert* exchange dan queue saat channel dibuka (self-healing), jadi loss data umum tidak terjadi jika publisher tetap berjalan.
- Management UI: `http://localhost:15672` (user: `guest`, pass: `guest`).
- Nginx conf: `nginx/after-sales.conf`.
- Dokumentasi webhook: `../docs/webhook-telegram/`.

## Diagram Alir Ketergantungan

```
frontend (5173)   <-- HTTP API -->   backend (host network, depends_on rabbitmq)
                                   |
                               RabbitMQ (5672, 15672)
                                   |
                           n8n workflow (aktif)
                                   |
                               Bot API Telegram
```