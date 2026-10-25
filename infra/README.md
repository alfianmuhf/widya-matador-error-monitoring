# Infra — Runbook Setup

Layanan di `infra/docker-compose.yml` dan konfigurasi terkait.

## Layanan

| Layanan | Detail |
|---|---|
| **backend** | Dibangun dari `Dockerfile` di `apps/error-service`. `network_mode: host`, `depends_on: [rabbitmq]` |
| **frontend** | Development server, port **5173** |
| **rabbitmq** | `rabbitmq:4-management`. Port: 5672 (AMQP) + 15672 (Management UI). Kredensial default: `guest`/`guest` |
| **rustfs** | `rustfs/rustfs:1.0.3`. S3 API `9000`, Console `9001` (default `rustfsadmin`/`rustfsadmin`). Volume: `rustfs_data` |
| **redis** | `redis:8-alpine`. Port: 6379 (bind `127.0.0.1`). Password via Docker secret `redis_password.txt`. Volume: `redis_data` |

## Cara Menjalankan

1. Pastikan file `.env` diletakkan pada folder `env-file` di luar repo:
   - `aidev/dev/env-file/.env.backend` (salin dari `.env.backend.example`)
   - `aidev/dev/env-file/.env.frontend` (salin dari `.env.frontend.example`)
2. Tanpa `RABBITMQ_URL` di `.env` Backend → notifikasi Telegram mati tapi sistem tetap jalan (publish dilewati + warning).
3. Pilihan Cara Menjalankan (Dari direktori `infra/`):

   **Opsi A — Deploy Lengkap (Backend, Frontend, dan RabbitMQ):**
   ```bash
   docker compose --env-file ../../env-file/.env.frontend up -d --build
   ```

   **Opsi B — Deploy Aplikasi Saja (Hanya Backend & Frontend, tanpa RabbitMQ/DB):**
   ```bash
   docker compose -f docker-compose.apps.yml --env-file ../../env-file/.env.frontend up -d --build
   ```

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

## Migrasi Database & Deploy

Backend menjalankan `npx prisma migrate deploy` saat container start. **Tidak ada reset**: data dan file lampiran lama tidak disentuh oleh restart atau redeploy. Seeder tidak lagi otomatis.

### Database yang sudah ada (sekali saja)

Baseline `20261026000000_init` dibuat dari schema database terbaru (mencakup teams, ticket_teams, dan username). Untuk database yang tabelnya sudah terlanjur dibuat (dev lokal, VPS), tandai baseline sebagai sudah diterapkan:

```bash
docker compose run --rm backend npx prisma migrate resolve --applied 20261026000000_init
```

Verifikasi:

```sql
SELECT migration_name, finished_at FROM _prisma_migrations;
```

Setelah itu `migrate deploy` hanya menerapkan migrasi baru. Kalau langkah ini dilewati, container gagal start (`table ... already exists`) — gagal keras, tetapi tidak merusak data.

### Environment baru

`migrate deploy` membuat seluruh skema. Seed dijalankan manual:

```bash
docker compose run --rm backend npm run seed
```

### Setelah deploy

Buka satu tiket yang punya lampiran dan pastikan gambarnya masih tampil. Kalau jumlah baris `ticket_attachments` berubah setelah restart, ada yang masih memakai `db push --force-reset` — periksa `infra/backend/Dockerfile`.

### GC lampiran

`npm run attachments:gc -- --dry-run` untuk melihat, tanpa `--dry-run` untuk menghapus objek yatim. Objek yang lebih muda dari 60 menit dilewati karena bisa jadi milik upload yang sedang berjalan.

## Object Storage (RustFS) — Lampiran Tiket

1. Jalankan service: `docker compose up -d rustfs`
2. Buka console `http://<IP>:9001`, login `rustfsadmin` / `rustfsadmin`, lalu buat bucket `erad-attachments`.
   Ganti kredensial lewat `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` sebelum dipakai produksi.
3. Isi `.env.backend`:
   ```ini
   S3_ENDPOINT=http://127.0.0.1:9000
   S3_REGION=us-east-1
   S3_BUCKET=erad-attachments
   S3_ACCESS_KEY=<access_key>
   S3_SECRET_KEY=<secret_key>
   S3_FORCE_PATH_STYLE=true
   ```
4. Tanpa `S3_BUCKET`, backend tetap jalan; hanya endpoint lampiran yang mengembalikan `503`.

Catatan:

- Port `9000` harus bisa dijangkau backend. Kalau storage dan backend beda host, pakai `http://<IP-storage>:9000` dan batasi lewat firewall — **jangan** buka `9000` ke internet.
- Console `9001` hanya untuk admin.
- `S3_FORCE_PATH_STYLE=true` wajib untuk RustFS, MinIO, dan SeaweedFS — tanpa itu SDK memanggil `bucket.<host>` dan gagal.
- Volume `rustfs_data` **wajib ikut backup bersama PostgreSQL**. Tanpa itu, baris `ticket_attachments` tetap ada sementara gambarnya hilang.
- Single-node, tanpa replikasi. Durabilitas berasal dari backup volume, bukan dari RustFS.
- Ganti provider (MinIO/R2/S3) hanya perlu ubah `S3_*` + copy objek dengan key yang sama; skema database tidak berubah.

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