# Planning: ROS Error Monitoring System — Auth Module (Phase 1)

## 1. Overview Project

**Nama Project:** After-Sales Monitoring System
**Tujuan:** Sistem monitoring error dari ROS (Robot Operating System) yang datanya dikirim dan divisualisasikan ke aplikasi web.
**Fase saat ini:** Membangun foundation — autentikasi user (login, JWT, refresh token) sebelum masuk ke fitur monitoring inti.

### Tech Stack

| Layer		 | Teknologi					|
|----------------|----------------------------------------------|
| Backend	 | Express.js (JavaScript, no TypeScript)	|
| Auth		 | JWT (access token) + Refresh Token (rotasi)	|
| Validasi	 | Zod						|
| ORM		 | Prisma					|
| Database	 | PostgreSQL					|
| Hashing	 | Bcrypt					|
| Error Handling | http-errors					|
| Frontend	 | React.js (menyusul)				|
| Infra		 | Docker, Docker Compose, Nginx		|

---

## 2. Repository Structure

```
after-sales/
├── apps/
│   ├── interfaces/        # React.js (frontend)
│   ├── monitoring-api/    # Express.js (backend)
│
├── infra/
│   ├── docker/
│   ├── compose/
│   └── nginx/
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   ├── deployment.md
│   └── rag.md
│
└── README.md
```

Monorepo ini nantinya cocok dikelola pakai **pnpm workspace** atau **turborepo** kalau butuh shared package (misal shared types/schema antara FE-BE), tapi untuk sekarang cukup dua app independen dulu.

---

## 3. Backend Structure (`apps/monitoring-api`)

```
monitoring-api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── src/
│   ├── config/
│   │   ├── env.js
│   │   └── prisma.js
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.route.js
│   │   │   ├── auth.schema.js
│   │   │   └── auth.repository.js
│   │   │
│   │   └── user/
│   │       ├── user.controller.js
│   │       ├── user.service.js
│   │       ├── user.route.js
│   │       ├── user.schema.js
│   │       └── user.repository.js
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── validate.middleware.js
│   │   └── error.middleware.js
│   │
│   ├── utils/
│   │   ├── jwt.js
│   │   ├── hash.js
│   │   └── logger.js
│   │
│   ├── routes/
│   │   ├── index.js
│   │   └── v1/
│   │       └── index.js
│   │
│   ├── app.js
│   └── server.js
│
├── prisma.config.js
├── .env
├── .gitignore
└── package.json
```

**Catatan pola arsitektur:** ini feature-based modular architecture dengan layering di dalam tiap module (route → controller → service → repository). Alur request:

```
Route → Middleware (validate/auth) → Controller → Service → Repository → Prisma → DB
```

- **Route**: definisi endpoint & middleware chain
- **Controller**: terima req/res, panggil service, kirim response — tidak ada business logic
- **Service**: business logic (hash password, generate token, dsb)
- **Repository**: satu-satunya layer yang boleh query Prisma langsung
- **Schema**: Zod schema untuk validasi input per module

---

## 4. Database Design

### ERD (Ringkas)

```
User (1) ──── (N) RefreshToken
```

### Model

**User**
- `id`, `email` (unique), `password` (hashed), `name`
- `role`: USER | ADMIN
- `isActive`, `isVerified`
- Relasi ke banyak `RefreshToken`

**RefreshToken**
- `id`, `token` (unique)
- `userId` → relasi ke User (cascade delete)
- `expiresAt`, `revoked`, `revokedAt`
- `userAgent`, `ipAddress` (untuk audit/tracking device)

Model ini sudah cukup solid untuk auth flow modern: mendukung multi-device login (satu user bisa punya banyak refresh token aktif), revoke per-device, dan audit trail (siapa login dari mana).

---

## 5. Auth Flow Design

### 5.1 Token Strategy

| Token			| Umur			| Disimpan di		| Tujuan			|
|--------------------|--|-----------------------|-----------------------|-------------------------------|
| Access Token (JWT)	| Pendek (30 menit)	| Memory / state FE	| Otorisasi request ke API	|
| Refresh Token		| Panjang (1 hari)	| HTTP-only Cookie / DB	| Ambil access token baru	|

**Kenapa refresh token disimpan juga di DB (tabel `RefreshToken`)?**
Supaya bisa di-revoke sewaktu-waktu (logout, ganti password, atau device dicurigai) — tidak seperti pure-JWT yang stateless dan tidak bisa dibatalkan sebelum expired.

### 5.2 Endpoint Rencana (Module `auth`)

| Method | Endpoint		| Deskripsi									|
|--------|----------------------|-------------------------------------------------------------------------------|
| POST	 | `/v1/auth/register`	| Registrasi user baru (opsional di fase 1, atau seed manual dulu)		|
| POST	 | `/v1/auth/login`	| Login pakai email + password → return access token + set refresh token cookie	|
| POST	 | `/v1/auth/refresh`	| Ambil access token baru pakai refresh token					|
| POST	 | `/v1/auth/logout`	| Revoke refresh token yang dipakai						|
| GET	 | `/v1/auth/me`	| Ambil data user yang sedang login (protected, pakai `auth.middleware`)	|

### 5.3 Detail Flow

**Login:**
1. User kirim `email` + `password` → divalidasi `auth.schema.js` (zod)
2. `auth.service.js` cari user via `auth.repository.js`
3. Compare password pakai bcrypt (`utils/hash.js`)
4. Jika valid → generate:
   - Access token (JWT, short-lived, payload: `userId`, `role`)
   - Refresh token (random string / JWT dengan expiry panjang)
5. Simpan refresh token ke DB (`RefreshToken` table) beserta `userAgent` & `ipAddress`
6. Response: access token di body, refresh token di **httpOnly cookie** (lebih aman dari XSS dibanding disimpan di localStorage)

**Refresh Token:**
1. Ambil refresh token dari cookie
2. Cek ke DB: token ada, belum revoked, belum expired
3. Jika valid → generate access token baru (bisa juga rotate refresh token — generate baru + revoke yang lama, lebih aman)
4. Jika tidak valid → 401, minta login ulang

**Logout:**
1. Ambil refresh token dari cookie
2. Set `revoked = true`, `revokedAt = now()` di DB
3. Clear cookie di response

**Protected Route (`auth.middleware.js`):**
1. Ambil access token dari header `Authorization: Bearer <token>`
2. Verify JWT (signature + expiry)
3. Attach `req.user = { id, role }`
4. Lanjut ke controller, atau reject 401 kalau invalid/expired

### 5.4 Error Handling

Semua error pakai `http-errors`, ditangkap oleh `error.middleware.js` sebagai global handler, contoh:
- `401 Unauthorized` — token invalid/expired, password salah
- `403 Forbidden` — role tidak cukup (dipakai nanti untuk endpoint monitoring)
- `409 Conflict` — email sudah terdaftar saat register
- `422 Unprocessable Entity` — validasi zod gagal

---

## 6. Security Checklist

- [x] Password di-hash pakai bcrypt (salt rounds = 10) — `src/utils/hash.js`
- [x] Refresh token disimpan sebagai httpOnly + secure + sameSite cookie (bukan localStorage) — `auth.controller.js`
- [x] Access token JWT expiry pendek (30 menit), refresh token panjang (1 hari) tapi bisa di-revoke — `src/utils/jwt.js`
- [x] Refresh token rotation: tiap kali refresh, token lama di-revoke, token baru dibuat — `auth.service.js`
- [ ] Rate limiting di endpoint `/login` (bisa pakai `express-rate-limit` — belum ada di list library, tambahkan kalau perlu)
- [x] CORS dikonfigurasi ketat (`origin` sesuai domain frontend saja) — `src/app.js`
- [x] Validasi input semua endpoint pakai zod via `validate.middleware.js` — `src/middlewares/validate.middleware.js`
- [x] Simpan `userAgent` & `ipAddress` di refresh token untuk audit/anomaly detection sederhana — `auth.service.js` + `auth.repository.js`
- [x] Token Reuse Detection: jika refresh token yang sudah di-revoke dipakai ulang, semua sesi user otomatis dicabut — `auth.service.js`

---

## 7. Environment Variables (`config/env.js`)

Divalidasi pakai zod saat startup, kira-kira isinya:

```
NODE_ENV=
PORT=
DATABASE_URL=
JWT_ACCESS_SECRET=
JWT_ACCESS_EXPIRES=30m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES=1d
CORS_ORIGIN=
```

---

## 8. Development Roadmap

### Phase 1 — Auth Foundation ✅ (selesai)
1. [x] Setup monorepo + folder structure
2. [x] Setup Prisma schema (User, RefreshToken) + sync database (`prisma db push`)
3. [x] Implement module `auth`: register, login, refresh (dengan token rotation), logout, me
4. [x] Implement middleware: `validate` (Zod), `auth` (JWT Bearer + role guard), `error` (global handler + 404)
5. [x] Setup Prisma Client v7 dengan `@prisma/adapter-pg` driver adapter
6. [x] Validasi environment variables saat startup via Zod (`config/env.js`)
7. [x] Token Reuse Detection — proteksi keamanan otomatis saat refresh token replay
8. [x] Testing otomatis seluruh endpoint (register, login, me, refresh, token reuse, logout)
9. [ ] Testing manual via Postman/Thunder Client

### Phase 2 — User Management
1. CRUD user (admin only) — create, list, update role/status
2. Module `user` lengkap dengan role-based access (`auth.middleware` + role check)

### Phase 3 — ROS Error Monitoring Core
1. Desain model DB untuk error log dari ROS (misal: `ErrorLog`, `Robot`/`Device`, `Severity`)
2. Endpoint ingest data dari ROS (kemungkinan pakai API key/service token khusus, beda dari user JWT)
3. Endpoint query & filter error log untuk ditampilkan di FE

### Phase 4 — Frontend (React)
1. Setup React app di `apps/interfaces`
2. Auth flow di FE: login page, axios interceptor untuk auto-refresh token, protected route
3. Dashboard monitoring

### Phase 5 — Infra & Deployment
1. Dockerfile untuk `monitoring-api` dan `interfaces`
2. Docker Compose (app + postgres + nginx)
3. Nginx reverse proxy config
4. Dokumentasi di `docs/deployment.md`
