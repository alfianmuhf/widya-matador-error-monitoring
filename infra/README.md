# Infra — Runbook Setup

Layanan di `infra/docker-compose.yml` dan konfigurasi terkait.

## Layanan

| Layanan | Detail |
|---|---|
| **backend** | Multi-stage build dari `infra/backend/Dockerfile`. Port `127.0.0.1:3000`. Healthcheck `GET /health`. |
| **frontend** | `vite build` → nginx alpine (`infra/frontend/nginx.conf`). Port `127.0.0.1:5173` → container `:80`. |
| **rabbitmq** | `rabbitmq:4-management`. Port: 5672 (AMQP) + 15672 (Management UI). Volume `rabbitmq_data` bersifat persisten. Ganti kredensial default `guest`/`guest` sebelum produksi. |
| **rustfs** | `rustfs/rustfs:1.0.3`. S3 API `9000`, Console `9001`. Volume: `rustfs_data`, `rustfs_logs`. |
| **rustfs-permissions** | One-shot `busybox` untuk `chown` volume ke UID 10001 sebelum RustFS start. |
| **redis** | `redis:8-alpine`. Cache dashboard (`summary`, `error-analytics`, `ticket-management`). Opsional: tanpa Redis, query dihitung ulang setiap request dan sistem tetap jalan. |

Semua port dipublikasikan ke `127.0.0.1` saja. Akses publik harus lewat nginx host (`infra/nginx/after-sales.conf`).

## Cara Menjalankan

1. Siapkan file environment backend di **luar** repo, dua tingkat di atas folder `infra/`:
   - `config/.env.backend` (salin dari `.env.backend.example`)
2. Frontend dibangun dengan `VITE_API_BASE_URL=/api` secara default. Nilai Vite dibaca saat `docker compose build`, bukan saat container berjalan; untuk API lain, export `VITE_API_BASE_URL` sebelum `docker compose up -d --build`. File `config/.env.frontend` tidak dipakai oleh Compose.
3. Tanpa `RABBITMQ_URL` di `.env` Backend → notifikasi Telegram mati tapi sistem tetap jalan (publish dilewati + warning); backend tidak menunggu healthcheck RabbitMQ.
4. Dari direktori `infra/`:

   ```bash
   docker compose up -d --build
   docker compose ps          # backend/frontend/rabbitmq/redis: healthy; rustfs: running; rustfs-permissions: exited (0)
   docker compose logs -f backend
   ```

## Catatan Penting

- **Log & resource**: setiap service memakai rotasi `json-file` 10 MB × 3 berkas dan `mem_limit` (backend/rabbitmq/rustfs 512 MB, frontend 128 MB). Kalau backend kehabisan memori saat ekspor besar, naikkan `mem_limit` backend.
- **Healthcheck**: backend hanya menunggu container RabbitMQ dimulai, bukan `healthy`; frontend menunggu backend `healthy`. Saat `RABBITMQ_URL` kosong, RabbitMQ tidak diperlukan oleh aplikasi. Saat URL diisi, backend menangani koneksi broker sendiri.
- **RabbitMQ** memakai volume persisten, jadi queue/DLQ tidak hilang saat container direcreate.
- **Management UI**: `http://localhost:15672`. Kredensial default `guest`/`guest` — ganti sebelum produksi.
- **Nginx host**: `nginx/after-sales.conf` (reverse proxy + header keamanan + SSE non-buffering).
- **Dokumentasi webhook**: `../docs/webhook-telegram/`.

### PostgreSQL di host

Backend berjalan di jaringan bridge, sehingga `localhost` berarti container backend, bukan host Docker. Gunakan `host.docker.internal` pada `DATABASE_URL` dan `DIRECT_URL` (lihat `.env.backend.example`). Compose memetakan nama ini ke `host-gateway` pada Linux Docker Engine; Docker Desktop sudah menyediakan nama tersebut. PostgreSQL host harus menerima koneksi dari jaringan Docker dan firewall harus mengizinkan portnya.

Untuk RabbitMQ bawaan Compose, gunakan hostname service `rabbitmq`, misalnya `amqp://<username>:<password>@rabbitmq:5672`. Kosongkan `RABBITMQ_URL` bila notifikasi tidak diperlukan.

## Keamanan Produksi

**1. TLS wajib.** Cookie refresh memakai `secure: true` saat `NODE_ENV=production`, sehingga login gagal di atas HTTP biasa. Setelah sertifikat tersedia (mis. certbot), tambahkan pada `nginx/after-sales.conf`:

```nginx
server {
    listen 80;
    server_name domain.anda;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name domain.anda;

    ssl_certificate     /etc/letsencrypt/live/domain.anda/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/domain.anda/privkey.pem;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    client_max_body_size 10M;
    # ... salin blok location / dan /api/ dari after-sales.conf ...
}
```

**2. `trust proxy`** sudah diset di `src/app.js` (`1` saat production) supaya `ip_address` pada audit log dan refresh token mencatat IP klien, bukan IP proxy.

**3. Kredensial storage.** Secara default RustFS dan contoh backend memakai access key `rustfsadmin`; secret key dibaca dari Docker secret `config/rustfs_pw.txt` (`chmod 600`). Untuk menggantinya, export `RUSTFS_ACCESS_KEY` sebelum menjalankan Compose dan set `S3_ACCESS_KEY` yang sama di `config/.env.backend`. Compose interpolation tidak membaca nilai dari `env_file` backend.

**4. Port storage** `9000`/`9001` hanya bind `127.0.0.1`. Kalau RustFS beda host, batasi lewat firewall — jangan buka ke internet.

## Backup

Yang wajib ikut backup, ketiganya:

1. **PostgreSQL** — di luar compose, bukan volume Docker:
   ```bash
   pg_dump "$DATABASE_URL" -Fc -f erad-$(date +%F).dump
   ```
2. **Volume `rustfs_data`** — tanpa ini baris `ticket_attachments` tetap ada sementara gambarnya hilang.
3. **`config/*.env*` dan `config/*_pw.txt`** — dalam bentuk terenkripsi.

Uji restore minimal sekali: pulihkan dump ke database kosong, jalankan backend, buka satu tiket berlampiran.

## Migrasi Database & Deploy

Backend menjalankan `./node_modules/.bin/prisma migrate deploy` saat container start. **Tidak ada reset**: data dan file lampiran lama tidak tersentuh oleh restart atau redeploy. Seeder tidak lagi otomatis.

Memanggil binary Prisma langsung (bukan `npx`) membuat container gagal cepat kalau CLI tidak ada di image, alih-alih mengunduh dari registry saat start. Karena itu `prisma` dipindahkan dari `devDependencies` ke `dependencies`.

### Database yang sudah ada (sekali saja)

Baseline `20261026000000_init` dibuat dari schema database terbaru (mencakup teams, ticket_teams, dan username). Untuk database yang tabelnya sudah terlanjur dibuat (dev lokal, VPS), tandai baseline sebagai sudah diterapkan:

```bash
docker compose run --rm backend ./node_modules/.bin/prisma migrate resolve --applied 20261026000000_init
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

## Object Storage (RustFS) — Lampiran Tiket

1. Jalankan service: `docker compose up -d rustfs`
2. Buka console `http://<IP>:9001`, login sesuai kredensial, lalu buat bucket `erad-attachments`.
3. Isi `.env.backend`:
   ```ini
   S3_ENDPOINT=http://rustfs:9000
   S3_REGION=us-east-1
   S3_BUCKET=erad-attachments
   S3_ACCESS_KEY=rustfsadmin
   S3_SECRET_KEY=<secret_key>
   S3_FORCE_PATH_STYLE=true
   ```
4. Tanpa `S3_BUCKET`, backend tetap jalan; hanya endpoint lampiran yang mengembalikan `503`.

Catatan:

- Dalam Compose, backend memakai DNS `rustfs` dan Redis memakai DNS `redis`. Untuk storage atau Redis eksternal, set `S3_ENDPOINT` atau `REDIS_HOST` ke host eksternal di `config/.env.backend`; Compose tidak menimpanya.
- Port `9000` harus bisa dijangkau backend. Kalau storage dan backend beda host, pakai `http://<IP-storage>:9000` dan batasi lewat firewall — **jangan** buka `9000` ke internet.
- Console `9001` hanya untuk admin.
- `S3_FORCE_PATH_STYLE=true` wajib untuk RustFS, MinIO, dan SeaweedFS — tanpa itu SDK memanggil `bucket.<host>` dan gagal.
- Volume `rustfs_data` **wajib ikut backup bersama PostgreSQL**. Tanpa itu, baris `ticket_attachments` tetap ada sementara gambarnya hilang.
- Single-node, tanpa replikasi. Durabilitas berasal dari backup volume, bukan dari RustFS.
- Ganti provider (MinIO/R2/S3) hanya perlu ubah `S3_*` + copy objek dengan key yang sama; skema database tidak berubah.

## Diagram Alir Ketergantungan

```
frontend (127.0.0.1:5173)  <-- HTTP -->  backend (127.0.0.1:3000, healthy)
                                              |
                                    RabbitMQ (5672, 15672)
                                              |
                                      n8n workflow
                                              |
                                      Bot API Telegram

backend  --S3-->  RustFS (9000)
backend  --SQL--> PostgreSQL (di luar compose)
backend  --TCP--> Redis (6379, cache opsional)
```
