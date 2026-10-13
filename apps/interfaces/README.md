# ERAD — Frontend Dashboard (interfaces)

Dashboard web **Error Report Automation Dashboard (ERAD)** untuk monitoring after-sales Load Scanner. Frontend React dari monorepo ini; backend-nya ada di `apps/error-service` (Express).

## Stack

- React `^19.2.8` + Vite `^8.2.2` (lihat `package.json` untuk versi pasti)

## Setup Lokal

1. Salin template env dari root repo:
   ```bash
   cp ../../.env.frontend.example .env
   ```
2. Isi `VITE_API_BASE_URL` (contoh: `http://localhost:3000`) — sesuaikan dengan port backend yang berjalan.
3. Install & jalankan:
   ```bash
   npm install
   npm run dev
   ```
   Buka `http://localhost:5173` (port default Vite).

## Build

```bash
npm run build   # output ke dist/
```

## Referensi

- [README root repo](../../README.md) — setup penuh, backend, database, infra
- [docs/api.md](../../docs/api.md) — referensi API yang dipakai halaman ini
