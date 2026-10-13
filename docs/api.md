# API Documentation â€” After-Sales Monitoring System (ERAD)

Dokumentasi teknis resmi Application Programming Interface (API) untuk **Error Report Automation Dashboard (ERAD) / Load Scanner After-Sales Monitoring Platform**.

> **Base URL:** `http://[host]:[port]`  
> **Contoh Lingkungan Lokal:** `http://localhost:3000` atau `http://127.0.0.1:3000`

---

## ðŸŒ Protokol Komunikasi & Arsitektur Jaringan

Sistem ini menerapkan **tiga protokol komunikasi** utama:

1. **REST API (Representational State Transfer)**:
   - Digunakan untuk operasi transaksional CRUD standar, autentikasi, filtering data, manipulasi tiket, serta streaming file unduhan binary (Excel `.xlsx` dan PDF `.pdf`).
   - Berjalan di atas HTTP/1.1 dan HTTP/2 dengan format pertukaran data JSON (`application/json`).
   - Menggunakan HTTP Method standar: `GET`, `POST`, `PATCH`, `PUT`, dan `DELETE`.

2. **Server-Sent Events (SSE)**:
   - Digunakan untuk komunikasi *real-time* satu arah dari server ke antarmuka pengguna (*unidirectional server-to-client push*) melalui *media type* `text/event-stream`.
   - Terdapat 2 endpoint streaming SSE aktif:
     - `GET /tickets/stream`: Menyiarkan event pembuatan tiket baru (`ticket_created`), pembaruan status (`ticket_updated`), dan penambahan komentar (`ticket_comment_added`).
     - `GET /audit-logs/stream`: Menyiarkan event rekam jejak audit log (`log_created`) seketika saat aksi sistem terjadi.

3. **AMQP (RabbitMQ)**:
   - Outbound event bus, bukan HTTP, tidak dipanggil client/browser.
   - `error-service` mempublish event ke exchange `erad.events` (topic, durable) â†’ queue `erad.telegram.notify` (+ dead-letter queue `erad.telegram.notify.dlx`) â†’ consumer workflow n8n â†’ Bot API Telegram.
   - Port 5672 (AMQP) dan 15672 (management UI).
   - Aktif hanya bila env `RABBITMQ_URL` diisi; tanpa itu publish dilewati dengan warning.

**Kontrak lengkap event + contoh payload:** `docs/webhook-telegram/README.md`; **panduan workflow n8n:** `docs/webhook-telegram/n8n-setup.md`.

4. **Catatan Arsitektur: Mengapa SSE, Bukan WebSocket?**:
   - **Karakteristik Kebutuhan**: Kebutuhan data real-time pada dashboard monitoring after-sales adalah *server push* (server memberitahu dashboard jika ada tiket atau log baru dari bot/lapangan). Tidak diperlukan komunikasi *bidirectional* frekuensi tinggi seperti pada game multipemain atau video call.
   - **Keandalan & Reconnection Bawaan**: SSE didukung secara native oleh browser melalui antarmuka W3C standard `EventSource` dengan mekanisme *automatic reconnection* bawaan jika koneksi terputus tanpa memerlukan library pihak ketiga yang berat.
   - **Firewall & Corporate Proxy Friendly**: SSE berjalan murni di atas koneksi HTTP biasa (Port 80/443), sehingga tidak akan diblokir oleh firewall kantor atau reverse proxy yang kerap memutus koneksi protokol WebSocket (`ws://` / `wss://`).
   - **Interaksi Balik yang Efisien**: Ketika client ingin merespons (misalnya mengubah status tiket atau menambah catatan penanganan), client cukup memanggil endpoint REST API biasa (`PATCH` / `POST`), dan hasilnya secara otomatis disiarkan ulang oleh server ke seluruh client melalui SSE.

---

## ðŸ“‹ Tabel Direktori Endpoint & Protokol (Master API Directory)

Tabel berikut menyajikan seluruh endpoint yang tersedia pada sistem, metode HTTP, protokol yang digunakan, serta batasan izin peran (*role permissions*):

| No | Modul | Protokol | Method | Endpoint Path | Izin Role | Deskripsi Singkat |
|:---:|:---|:---:|:---:|:---|:---:|:---|
| 1 | **System** | REST API | `GET` | `/health` | Publik | Health check status service |
| 2 | **System** | REST API | `GET` | `/` | Publik | Service information & status |
| 3 | **Auth** | REST API | `POST` | `/auth/register` | Publik | Pendaftaran mandiri user baru |
| 4 | **Auth** | REST API | `POST` | `/auth/login` | Publik | Login email & password (termasuk user invited) |
| 5 | **Auth** | REST API | `POST` | `/auth/refresh` | Publik (Cookie) | Rotasi dan perpanjangan access token |
| 6 | **Auth** | REST API | `POST` | `/auth/logout` | Terautentikasi | Hapus cookie refresh token & cabut sesi |
| 7 | **Auth** | REST API | `GET` | `/auth/me` | Terautentikasi | Ambil profil pengguna yang sedang login |
| 8 | **Auth** | REST API | `POST`, `PATCH` | `/auth/change-password` | Terautentikasi | Ganti password akun sendiri (aktivasi akun invited) |
| 9 | **Auth** | REST API | `POST` | `/auth/forgot-password` | Publik | Kirim OTP 6 digit ke Telegram untuk reset password (tidak membocorken existence email) |
| 10 | **Auth** | REST API | `POST` | `/auth/reset-password` | Publik | Verifikasi OTP dan update password; hapus refresh token, reset lockout |
| 11 | **Users** | REST API | `POST` | `/users` | `admin` | Buat akun pengguna baru (status awal: `invited`) |
| 12 | **Users** | REST API | `GET` | `/users` | `admin`, `coordinator` | Ambil daftar seluruh pengguna dashboard (read-only coordinator) |
| 13 | **Users** | REST API | `GET` | `/users/:id` | `admin`, `coordinator` | Ambil detail satu pengguna |
| 14 | **Users** | REST API | `PATCH`, `PUT` | `/users/:id` | `admin` | Ubah data pengguna (status hanya `active`/`suspended`) |
| 15 | **Users** | REST API | `DELETE` | `/users/:id` | `admin` | Hapus pengguna dashboard |
| 16 | **Telegram** | REST API | `POST` | `/telegram-users` | `admin` | Tambah user Telegram ke whitelist bot |
| 17 | **Telegram** | REST API | `GET` | `/telegram-users` | `admin`, `coordinator` | Daftar user Telegram yang di-whitelist (read-only coordinator) |
| 18 | **Telegram** | REST API | `GET` | `/telegram-users/:id` | `admin`, `coordinator` | Detail user Telegram whitelist |
| 19 | **Telegram** | REST API | `PATCH` | `/telegram-users/:id` | `admin` | Update status/username/divisi user Telegram |
| 20 | **Telegram** | REST API | `DELETE` | `/telegram-users/:id` | `admin` | Hapus user Telegram dari whitelist |
| 21 | **Master Client** | REST API | `GET` | `/clients` | Semua Role | Daftar client perusahaan |
| 22 | **Master Client** | REST API | `POST` | `/clients` | Semua Role | Tambah data client baru |
| 23 | **Master Client** | REST API | `GET` | `/clients/:id` | Semua Role | Detail client |
| 24 | **Master Client** | REST API | `PATCH` | `/clients/:id` | Semua Role | Perbarui data client |
| 25 | **Master Client** | REST API | `DELETE` | `/clients/:id` | Semua Role | Hapus data client |
| 26 | **Master Lokasi** | REST API | `GET` | `/locations` | Semua Role | Daftar lokasi operasional site |
| 27 | **Master Lokasi** | REST API | `POST` | `/locations` | Semua Role | Tambah lokasi baru |
| 28 | **Master Lokasi** | REST API | `GET` | `/locations/:id` | Semua Role | Detail lokasi |
| 29 | **Master Lokasi** | REST API | `PATCH` | `/locations/:id` | Semua Role | Perbarui data lokasi |
| 30 | **Master Lokasi** | REST API | `DELETE` | `/locations/:id` | Semua Role | Hapus data lokasi |
| 31 | **Master Komponen** | REST API | `GET` | `/components` | Semua Role | Daftar master komponen mesin/robot |
| 32 | **Master Komponen** | REST API | `POST` | `/components` | Semua Role | Tambah komponen baru |
| 33 | **Master Komponen** | REST API | `GET` | `/components/:id` | Semua Role | Detail komponen |
| 34 | **Master Komponen** | REST API | `PATCH` | `/components/:id` | Semua Role | Perbarui data komponen |
| 35 | **Master Komponen** | REST API | `DELETE` | `/components/:id` | Semua Role | Hapus data komponen |
| 36 | **Master Failure** | REST API | `GET` | `/failure-codes` | Semua Role | Daftar failure code kerusakan |
| 37 | **Master Failure** | REST API | `POST` | `/failure-codes` | Semua Role | Tambah failure code baru |
| 38 | **Master Failure** | REST API | `GET` | `/failure-codes/:id` | Semua Role | Detail failure code |
| 39 | **Master Failure** | REST API | `PATCH` | `/failure-codes/:id` | Semua Role | Perbarui data failure code |
| 40 | **Master Failure** | REST API | `DELETE` | `/failure-codes/:id` | Semua Role | Hapus data failure code |
| 41 | **Master Asset** | REST API | `GET` | `/assets` | Semua Role | Daftar unit Load Scanner |
| 42 | **Master Asset** | REST API | `POST` | `/assets` | Semua Role | Tambah unit Load Scanner baru |
| 43 | **Master Asset** | REST API | `GET` | `/assets/:id` | Semua Role | Detail unit Load Scanner |
| 44 | **Master Asset** | REST API | `PATCH` | `/assets/:id` | Semua Role | Perbarui unit Load Scanner |
| 45 | **Master Asset** | REST API | `DELETE` | `/assets/:id` | Semua Role | Hapus unit Load Scanner |
| 46 | **Tiket** | **SSE Stream** | `GET` | `/tickets/stream` | Semua Role | Real-time live update stream tiket |
| 47 | **Tiket** | REST API | `GET` | `/tickets` | Semua Role | Ambil daftar tiket dengan filter & paginasi |
| 48 | **Tiket** | REST API | `GET` | `/tickets/:id` | Semua Role | Detail tiket lengkap riwayat & komentar |
| 49 | **Tiket** | REST API | `POST` | `/tickets` | Semua Role | Buat tiket baru dari dashboard |
| 50 | **Tiket** | REST API | `PATCH` | `/tickets/:id` | Semua Role | Update status tiket / penanganan |
| 51 | **Tiket** | REST API | `POST` | `/tickets/:id/comments` | Semua Role | Tambah catatan penanganan ke tiket |
| 52 | **Tiket** | REST API | `POST` | `/tickets/:id/claim` | Software / Admin | Klaim tiket oleh tim Software (klaim awal jadi Leader) |
| 53 | **Tiket** | REST API | `GET` | `/tickets/:id/assignees` | Semua Role | Ambil daftar tim penanganan tiket |
| 54 | **Tiket** | REST API | `POST` | `/tickets/:id/assignees` | Leader / Admin | Tambah anggota tim penanganan tiket |
| 55 | **Tiket** | REST API | `PATCH`, `PUT` | `/tickets/:id/assignees/:assigneeId` | Leader / Admin | Ubah data anggota tim penanganan tiket |
| 56 | **Tiket** | REST API | `PATCH` | `/tickets/:id/leader` | Leader / Admin | Alihkan kepemimpinan tiket ke anggota lain |
| 57 | **Tiket** | REST API | `DELETE` | `/tickets/:id/assignees/:assigneeId` | Leader / Admin / Self | Hapus anggota dari tim penanganan tiket |
| 58 | **Tiket** | REST API | `GET` | `/tickets/:id/history` | Semua Role | Linimasa riwayat versi tiket |
| 59 | **Tiket** | REST API | `GET` | `/tickets/:id/history/:version` | Semua Role | Detail snapshot versi riwayat tiket tertentu |
| 60 | **Manajemen Tiket** | REST API | `GET` | `/ticket-management` | `coordinator` | Ambil tiket khusus yang dikelola coordinator (Aftersales: open & dibuat dirinya; Software: escalated & assigned) |
| 61 | **Manajemen Tiket** | REST API | `PATCH` | `/ticket-management/:id` | `coordinator` | Update status & tindakan tiket dari menu manajemen tiket |
| 62 | **Manajemen Tiket** | REST API | `POST` | `/ticket-management/:id/assignees` | `coordinator` | Tambah anggota tim software ke `ticket_assignees` |
| 63 | **Manajemen Tiket** | REST API | `DELETE` | `/ticket-management/:id/assignees/:assigneeId` | `coordinator` | Hapus anggota tim software dari `ticket_assignees` |
| 64 | **Export** | REST API | `GET` | `/exports/excel`, `/tickets/export/excel` | Semua Role | Download rekapitulasi file Excel (`.xlsx`) |
| 65 | **Export** | REST API | `GET` | `/exports/pdf`, `/tickets/export/pdf` | Semua Role | Download rekapitulasi file PDF (`.pdf`) |
| 66 | **Audit Log** | **SSE Stream** | `GET` | `/audit-logs/stream` | Semua Role | Real-time live stream audit log |
| 67 | **Audit Log** | REST API | `GET` | `/audit-logs` | Semua Role | Daftar rekam jejak audit log |
| 68 | **Audit Log** | REST API | `GET` | `/audit-logs/:id` | Semua Role | Detail satu rekam jejak audit |
| 69 | **Ringkasan** | REST API | `GET` | `/summary`, `/ringkasan` | Semua Role | KPI, tren bulanan, top ranking kerusakan |
| 70 | **Analitik** | REST API | `GET` | `/error-analytics`, `/analytics` | Semua Role | Pareto, heatmap unit vs komponen, dsb. |

---

## ðŸ”’ Konvensi Umum & Struktur Error Response

### 1. Format Respons Sukses (Status Code `200` & `201`)
```json
{
  "success": true,
  "message": "Deskripsi hasil operasi",
  "data": { ... }
}
```

### 2. Format Respons Error Standar (Status Code `4xx` & `5xx`)
Ketika request ditolak karena autentikasi, otorisasi, atau duplikasi:
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Access token telah kedaluwarsa"
}
```

### 3. Format Respons Error Validasi Input (`422 Unprocessable Entity`)
Ketika body JSON atau query string melanggar aturan skema validasi (Zod):
```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "email",
      "message": "Format email tidak valid"
    },
    {
      "field": "password",
      "message": "Password minimal 6 karakter"
    }
  ]
}
```

---

## 1. System & Health Check Module

### `GET /health`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/health` |
| **Autentikasi** | Tidak Diperlukan (Publik) |
| **Role Izin** | Publik |

Memeriksa ketersediaan dan status kesehatan server backend.

#### Response Sukses: `200 OK`
```json
{
  "status": "ok",
  "service": "error-service",
  "timestamp": "2026-09-21T05:30:00.000Z"
}
```

---

## 2. Auth Module (`/auth`)

### `POST /auth/register`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/auth/register` |
| **Autentikasi** | Tidak Diperlukan (Publik) |
| **Role Izin** | Publik |

Mendaftarkan pengguna baru secara mandiri.

#### Request Body Valid
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "viewer",
  "division": "software"
}
```

#### Response Sukses: `201 Created`
```json
{
  "success": true,
  "message": "Registrasi akun berhasil",
  "data": {
    "user": {
      "id": "48247728-9cfe-4789-a01f-bd27ad0272a1",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "viewer",
      "division": "software",
      "status": "active",
      "must_change_password": false,
      "created_at": "2026-10-09T05:30:00.000Z"
    }
  }
}
```

#### âŒ Contoh Input Error & Response: `422 Unprocessable Entity`
Jika input email tidak valid dan password kurang dari 6 karakter:
```json
// Request Body yang Salah:
{
  "email": "bukan-format-email",
  "password": "123",
  "name": "J"
}

// Response Error Server:
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "email",
      "message": "Format email tidak valid"
    },
    {
      "field": "password",
      "message": "Password minimal 6 karakter"
    },
    {
      "field": "name",
      "message": "Nama minimal 2 karakter"
    }
  ]
}
```

#### âŒ Contoh Error Duplikasi Email: `409 Conflict`
Jika email yang didaftarkan sudah ada di sistem:
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Email sudah terdaftar. Silakan gunakan email lain."
}
```

---

### `POST /auth/login`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/auth/login` |
| **Autentikasi** | Tidak Diperlukan (Publik) |
| **Role Izin** | Publik |

Autentikasi pengguna menggunakan email dan kata sandi. Menerbitkan Access Token (di response body) dan Refresh Token (di HttpOnly Cookie). Dilengkapi proteksi *Account Lockout* setelah 5 kali gagal berturut-turut.

> â„¹ï¸ **Catatan Mekanisme Pengguna Berstatus `invited`:**  
> Pengguna yang baru dibuat oleh admin (status: `invited`) **dapat melakukan login** dengan password awal yang diberikan (`[email_prefix]12345`).  
> Response login akan mengembalikan status akun `"invited"` dan flag `"mustChangePassword": true`. Di sisi frontend, hal ini memicu **dialog/modal paksa ubah password** yang memblokir akses ke fitur dashboard lainnya hingga pengguna berhasil mengganti kata sandi.

#### Request Body Valid
```json
{
  "email": "admin@widya.com",
  "password": "password123"
}
```

#### Response Sukses (User Aktif): `200 OK`
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {
      "id": "48247728-9cfe-4789-a01f-bd27ad0272a1",
      "email": "admin@widya.com",
      "name": "Super Admin",
      "role": "admin",
      "division": "none",
      "status": "active",
      "mustChangePassword": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Response Sukses (User Berstatus `invited`): `200 OK`
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "bruno@erad.id",
      "name": "Bruno Aftersales",
      "role": "coordinator",
      "division": "after_sales",
      "status": "invited",
      "mustChangePassword": true
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### âŒ Contoh Error Password Salah: `401 Unauthorized`
Menampilkan sisa percobaan login sebelum akun terkunci:
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Email atau password salah. Sisa kesempatan login: 4 kali."
}
```

#### âŒ Contoh Error Akun Terkunci (Account Lockout): `423 Locked`
Terjadi jika pengguna gagal memasukkan password sebanyak 5 kali berturut-turut:
```json
{
  "success": false,
  "statusCode": 423,
  "message": "Akun Anda terkunci selama 15 menit karena 5 kali percobaan login gagal."
}
```

#### âŒ Contoh Error Akun Dinonaktifkan: `403 Forbidden`
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Akun Anda telah dinonaktifkan. Silakan hubungi administrator."
}
```

---

### `POST /auth/refresh`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/auth/refresh` |
| **Autentikasi** | Cookie `refreshToken` |
| **Role Izin** | Publik |

Menerbitkan Access Token baru menggunakan cookie `refreshToken`. Mendukung pengguna berstatus `active` maupun `invited` yang sedang dalam proses aktivasi password.

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "message": "Access token berhasil diperbarui",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "48247728-9cfe-4789-a01f-bd27ad0272a1",
      "email": "admin@widya.com",
      "name": "Super Admin",
      "role": "admin",
      "division": "none",
      "status": "active",
      "mustChangePassword": false
    }
  }
}
```

#### âŒ Contoh Error Refresh Token Kedaluwarsa / Hilang: `401 Unauthorized`
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Refresh token tidak valid atau telah kedaluwarsa"
}
```

---

### `POST /auth/change-password` & `PATCH /auth/change-password`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST`, `PATCH` |
| **Endpoint Path** | `/auth/change-password` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | Semua Pengguna Terautentikasi |

Mengubah kata sandi akun pengguna yang sedang aktif.  
> ðŸ’¡ **Aktivasi Akun Otomatis:**  
> Ketika user berstatus `invited` mengganti passwordnya melalui endpoint ini:
> 1. Status akun pengguna otomatis diperbarui dari **`"invited"` $\rightarrow$ `"active"`**.
> 2. Flag **`must_change_password`** disetel menjadi **`false`**.
> 3. Parameter `currentPassword` bersifat **opsional** jika pengguna berstatus `invited` / `must_change_password: true`, namun wajib untuk user yang sudah aktif normal.
> 4. Sesi refresh token diperbarui dan access token baru dikembalikan di respons.

#### Request Body Valid
```json
{
  "currentPassword": "passwordLama123",
  "newPassword": "passwordBaru123",
  "confirmPassword": "passwordBaru123"
}
```

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "message": "Password berhasil diubah",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "email": "bruno@erad.id",
      "name": "Bruno Aftersales",
      "role": "coordinator",
      "division": "after_sales",
      "status": "active",
      "must_change_password": false,
      "password_changed_at": "2026-10-09T08:30:00.000Z",
      "updated_at": "2026-10-09T08:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### âŒ Contoh Error Konfirmasi Tidak Cocok: `422 Unprocessable Entity`
```json
// Request Body yang Salah:
{
  "currentPassword": "passwordLama123",
  "newPassword": "passwordBaru123",
  "confirmPassword": "passwordBeda123"
}

// Response Error Server:
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "confirmPassword",
      "message": "Konfirmasi password baru tidak cocok"
    }
  ]
}
```

#### âŒ Contoh Error Password Lama Salah: `400 Bad Request`
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Password saat ini tidak sesuai"
}
```

---

### `POST /auth/forgot-password`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/auth/forgot-password` |
| **Autentikasi** | Tidak perlu (Publik) |
| **Role Izin** | Publik |

Meminta OTP 6 digit untuk reset password. OTP dikirim via **DM Telegram** ke akun yang pernah di-link saat invite (field opsional `telegramId` di `POST /users`). Link akun↔telegram dan OTP disimpan **in-memory** di proses backend (hilang saat server restart — cukup minta OTP baru).

> 💡 **Respons selalu generik:** endpoint ini merespons sama persis apakah email terdaftar atau tidak — tidak membocorkan keberadaan akun.

#### Request Body Valid
```json
{
  "email": "bruno@erad.id"
}
```

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "message": "Jika terdaftar, OTP terkirim ke Telegram Anda."
}
```

#### Catatan OTP
- **TTL 5 menit**, maksimal **3 percobaan** verifikasi, dan **sekali pakai** (single-use).
- Bila `RABBITMQ_URL` tidak dikonfigurasi atau link telegram tidak ada, OTP tidak terkirim — respons tetap generik.

### `POST /auth/reset-password`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/auth/reset-password` |
| **Autentikasi** | Tidak perlu (Publik) |
| **Role Izin** | Publik |

Meriset password menggunakan OTP dari Telegram, **tanpa password lama**. Jika berhasil: `password_hash` diperbarui, `must_change_password` → `false`, lockout (`failed_login_attempts` / `locked_until`) direset, status diaktifkan bila masih `invited` (akun `suspended` tetap `suspended`), dan **semua refresh token dicabut** (paksa login ulang di semua perangkat).

#### Request Body Valid
```json
{
  "email": "bruno@erad.id",
  "otp": "481920",
  "newPassword": "passwordBaru123"
}
```

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "message": "Password berhasil direset. Silakan login dengan password baru."
}
```

#### ❌ Contoh Error OTP Salah / Terlalu Banyak Percobaan / Kedaluwarsa: `401 Unauthorized`
```json
{
  "success": false,
  "statusCode": 401,
  "message": "OTP salah. Periksa kembali kode dari Telegram."
}
```
> Pesan berbeda per kasus: `"Terlalu banyak percobaan. OTP dibatalkan, minta OTP baru."` dan `"OTP kedaluwarsa. Silakan minta OTP baru."`

#### ❌ Contoh Error OTP Tidak Ditemukan / Sudah Dipakai: `400 Bad Request`
```json
{
  "success": false,
  "statusCode": 400,
  "message": "OTP tidak valid atau sudah kedaluwarsa."
}
```

#### ❌ Contoh Error Validasi: `422 Unprocessable Entity`
```json
// OTP bukan 6 digit angka ATAU newPassword < 6 karakter:
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "otp",
      "message": "OTP harus 6 digit angka"
    }
  ]
}
```

---

## 3. User Management Module (`/users`)

### `POST /users`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/users` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Hanya `admin`** |

Mendaftarkan akun pengguna dashboard baru.
* **Status Awal:** Akun otomatis dibuat dengan status **`invited`** dan flag **`must_change_password: true`**.
* **Password Awal:** Otomatis digenerate dengan pola **nama email sebelum `@` + `12345`** (contoh: `joko@gmail.com` $\rightarrow$ `joko12345`). Nilai `initialPassword` ini dikembalikan di respon agar admin dapat meneruskannya kepada pengguna.
* **Audit Trail:** Pembuatan akun dicatat lengkap dengan data aktor pembuat di sistem `audit_logs`.

* **telegramId** *(String, opsional, max 50)*: tujuan DM notifikasi invite, tidak disimpan di DB (hanya diverifikasi ringan ke whitelist username).
* **username** *(String, opsional, max 100)*: tujuan DM notifikasi invite, tidak disimpan di DB, diverifikasi ringan ke whitelist.

#### Request Body Valid
```json
{
  "email": "joko@gmail.com",
  "name": "Joko Susilo",
  "role": "coordinator",
  "division": "after_sales",
  "telegramId": "123456789",
  "username": "joko_d"
}
```
```

#### Response Sukses: `201 Created`
```json
{
  "success": true,
  "message": "Pengguna baru berhasil didaftarkan",
  "data": {
    "user": {
      "id": "981ba263-8103-4c76-a7ed-f241297e8b27",
      "email": "joko@gmail.com",
      "name": "Joko Susilo",
      "role": "coordinator",
      "division": "after_sales",
      "status": "invited",
      "must_change_password": true,
      "created_at": "2026-10-09T05:30:00.000Z"
    },
    "initialPassword": "joko12345"
  }
}
```

#### âŒ Contoh Input Error & Response: `422 Unprocessable Entity`
Jika nama kosong atau role tidak valid:
```json
// Request Body yang Salah:
{
  "email": "invalid-email-address",
  "name": "",
  "role": "SUPERUSER"
}

// Response Error Server:
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "email",
      "message": "Format email tidak valid"
    },
    {
      "field": "name",
      "message": "Nama minimal 2 karakter"
    },
    {
      "field": "role",
      "message": "Role harus berupa ADMIN, COORDINATOR, atau VIEWER"
    }
  ]
}
```

#### âŒ Contoh Akses Ditolak untuk Viewer: `403 Forbidden`
Jika pengguna dengan peran `viewer` mencoba membuat akun:
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Akses dilarang: Peran tidak memiliki izin yang cukup"
}
```

---

### `GET /users`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/users` |
| **Query Params** | `?page=1&limit=10&search=&role=&division=&status=` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | `admin`, `coordinator` (Viewer diblokir) |

Mengambil daftar seluruh pengguna dashboard dengan paginasi dan filter pencarian.
* Koordinator hanya memiliki hak melihat (read-only).

---

### `GET /users/:id`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/users/:id` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | `admin`, `coordinator` (Viewer diblokir) |

#### âŒ Contoh Error Data Tidak Ditemukan: `404 Not Found`
Jika ID pengguna tidak terdaftar:
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Pengguna dengan ID tersebut tidak ditemukan"
}
```

---

### `PATCH /users/:id` & `PUT /users/:id`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `PATCH`, `PUT` |
| **Endpoint Path** | `/users/:id` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Hanya `admin`** |

Memperbarui data pengguna (nama, email, role, divisi, atau status akun).
> âš ï¸ **Batasan Nilai Status Akun:**  
> Status akun pengguna hanya dapat diubah ke opsi **`"active"`** atau **`"suspended"`**. Status pengguna tidak dapat diubah kembali menjadi `"invited"`.

#### Request Body Valid
```json
{
  "name": "Joko Susilo, S.T.",
  "role": "coordinator",
  "division": "software",
  "status": "active"
}
```

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "message": "Data pengguna berhasil diperbarui",
  "data": {
    "user": {
      "id": "981ba263-8103-4c76-a7ed-f241297e8b27",
      "email": "joko@gmail.com",
      "name": "Joko Susilo, S.T.",
      "role": "coordinator",
      "division": "software",
      "status": "active",
      "must_change_password": false,
      "updated_at": "2026-10-09T08:35:00.000Z"
    }
  }
}
```

#### âŒ Contoh Error Status Ditolak Menjadi 'invited': `400 Bad Request`
Jika mencoba mengirim `"status": "invited"`:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Status tidak dapat diubah ke 'invited'. Opsi status hanya 'active' atau 'suspended'."
}
```

#### âŒ Contoh Error Modifikasi Akun Sendiri: `400 Bad Request`
Jika admin/koordinator mencoba mendemosi role atau menonaktifkan status akunnya sendiri:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Anda tidak dapat menonaktifkan akun Anda sendiri demi menjaga integritas akses sistem"
}
```

#### âŒ Contoh Error Body Kosong: `422 Unprocessable Entity`
Jika mengirim body JSON `{}` tanpa perubahan field:
```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "",
      "message": "Minimal satu field harus disertakan untuk pembaruan data"
    }
  ]
}
```

---

### `DELETE /users/:id`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `DELETE` |
| **Endpoint Path** | `/users/:id` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Hanya `admin`** |

#### âŒ Contoh Error Hapus Akun Sendiri: `400 Bad Request`
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Anda tidak dapat menghapus akun Anda sendiri"
}
```

---

## 4. Telegram Whitelist Module (`/telegram-users`)

Endpoint ini mengelola akun pengguna Telegram yang diizinkan berinteraksi dengan bot notifikasi tiket.  
> ðŸ’¡ **Path Alias**: Endpoint ini juga dapat diakses melalui alias path `/whitelist-telegram`.

---

### `POST /telegram-users`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/telegram-users` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Hanya `admin`** |

Menambahkan akun Telegram baru ke whitelist bot.

#### Request Body Valid
```json
{
  "telegramId": "123456789",
  "username": "john_doe",
  "fullName": "John Doe Tele",
  "division": "software",
  "isActive": true
}
```

* **`telegramId`** *(String, wajib, max 50)*: ID unik pengguna Telegram.
* **`username`** *(String, opsional, max 100)*: Username Telegram tanpa atau dengan tanda `@`.
* **`fullName`** *(String, opsional, max 100)*: Nama lengkap pengguna.
* **`division`** *(Enum string, opsional)*: Pilihan divisi: `"none"`, `"after_sales"`, atau `"software"`.
* **`isActive`** *(Boolean, opsional, default `true`)*: Status keaktifan whitelist.

#### Response Sukses: `201 Created`
```json
{
  "success": true,
  "message": "User Telegram berhasil ditambahkan ke whitelist",
  "data": {
    "telegramUser": {
      "id": "771e8400-e29b-41d4-a716-446655440001",
      "telegramId": "123456789",
      "username": "john_doe",
      "fullName": "John Doe Tele",
      "division": "software",
      "isActive": true,
      "createdAt": "2026-10-09T08:00:00.000Z",
      "updatedAt": "2026-10-09T08:00:00.000Z"
    }
  }
}
```

#### âŒ Contoh Error Validasi Input: `422 Unprocessable Entity`
Jika `telegramId` kosong atau divisi tidak valid:
```json
// Request Body yang Salah:
{
  "telegramId": "",
  "division": "marketing"
}

// Response Error Server:
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "telegramId",
      "message": "Telegram ID wajib diisi"
    },
    {
      "field": "division",
      "message": "Divisi harus berupa none, after_sales, atau software"
    }
  ]
}
```

#### âŒ Contoh Error Duplikasi Telegram ID: `409 Conflict`
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Telegram ID tersebut sudah terdaftar di whitelist"
}
```

---

### `GET /telegram-users`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/telegram-users` |
| **Query Params** | `?page=1&limit=10&search=&division=&isActive=all` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | `admin`, `coordinator` (Viewer diblokir) |

Mengambil daftar akun Telegram yang terdaftar dengan paginasi dan filter.

* **`page`** *(Integer, opsional, default `1`)*: Halaman data.
* **`limit`** *(Integer, opsional, default `10`)*: Jumlah data per halaman.
* **`search`** *(String, opsional)*: Mencari berdasarkan `username`, `fullName`, atau `telegramId`.
* **`division`** *(String, opsional)*: Filter berdasarkan divisi (`none`, `after_sales`, `software`).
* **`isActive`** *(String enum, opsional, default `"all"`)*: Filter status keaktifan (`true`, `false`, `all`).

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "data": {
    "telegramUsers": [
      {
        "id": "771e8400-e29b-41d4-a716-446655440001",
        "telegramId": "123456789",
        "username": "john_doe",
        "fullName": "John Doe Tele",
        "division": "software",
        "isActive": true,
        "createdAt": "2026-10-09T08:00:00.000Z",
        "updatedAt": "2026-10-09T08:00:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

### `GET /telegram-users/:id`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/telegram-users/:id` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | `admin`, `coordinator` (Viewer diblokir) |

Mengambil informasi detail akun Telegram berdasarkan ID UUID whitelist.

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "data": {
    "telegramUser": {
      "id": "771e8400-e29b-41d4-a716-446655440001",
      "telegramId": "123456789",
      "username": "john_doe",
      "fullName": "John Doe Tele",
      "division": "software",
      "isActive": true,
      "createdAt": "2026-10-09T08:00:00.000Z",
      "updatedAt": "2026-10-09T08:00:00.000Z"
    }
  }
}
```

---

### `PATCH /telegram-users/:id` & `PUT /telegram-users/:id`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `PATCH`, `PUT` |
| **Endpoint Path** | `/telegram-users/:id` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Hanya `admin`** |

Memperbarui informasi akun Telegram (username, fullName, division, atau status keaktifan).

#### Request Body Valid
```json
{
  "username": "john_new_handle",
  "fullName": "John Doe Senior",
  "division": "after_sales",
  "isActive": false
}
```

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "message": "Data Telegram whitelist berhasil diperbarui",
  "data": {
    "telegramUser": {
      "id": "771e8400-e29b-41d4-a716-446655440001",
      "telegramId": "123456789",
      "username": "john_new_handle",
      "fullName": "John Doe Senior",
      "division": "after_sales",
      "isActive": false,
      "updatedAt": "2026-10-09T08:20:00.000Z"
    }
  }
}
```

---

### `DELETE /telegram-users/:id`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `DELETE` |
| **Endpoint Path** | `/telegram-users/:id` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Hanya `admin`** |

Menghapus akun Telegram dari whitelist.
* Jika akun Telegram memiliki riwayat relasi (misalnya pernah tercatat di audit log atau penugasan tiket), backend secara aman melakukan **soft-delete** dengan mengubah `is_active` menjadi `false`.
* Jika tidak ada keterkaitan data, entitas akan dihapus permanen.

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "message": "User Telegram berhasil dihapus dari whitelist",
  "data": {
    "telegramUser": {
      "id": "771e8400-e29b-41d4-a716-446655440001",
      "telegramId": "123456789"
    }
  }
}
```

---

## 5. Master Data Modules (`/clients`, `/locations`, `/components`, `/failure-codes`, `/assets`)

Seluruh entitas Master Data dapat diakses (baca maupun modifikasi CRUD) oleh **seluruh peran** (`admin`, `coordinator`, `viewer`).

---

### 5.1 Client Module (`/clients`)

Mengelola data pelanggan (Client / Mitra Perusahaan).

| Method | Endpoint | Deskripsi | Query Params / Body |
|:---|:---|:---|:---|
| `GET` | `/clients` | Daftar client paginasi | `?page=1&limit=10&search=&isActive=all` |
| `GET` | `/clients/:id` | Detail client | ID UUID |
| `POST` | `/clients` | Tambah client baru | `{ "name": "PT Sumber Rejeki", "isActive": true }` |
| `PATCH` / `PUT` | `/clients/:id` | Edit data client | `{ "name": "PT Sumber Rejeki Baru", "isActive": false }` |
| `DELETE` | `/clients/:id` | Hapus client | ID UUID |

#### âŒ Contoh Error Foreign Key Constraint pada Penghapusan: `400 Bad Request`
Jika menghapus client yang masih memiliki aset unit terhubung:
```json
// Request:
DELETE /clients/c1f7b7f1-88bc-4eb7-a720-3b9508bc5c6d

// Response Error Server:
{
  "success": false,
  "statusCode": 400,
  "message": "Tidak dapat menghapus client karena masih terdapat aset/unit yang terhubung. Nonaktifkan client (isActive: false) sebagai alternatif."
}
```

---

### 5.2 Location Module (`/locations`)

Mengelola data lokasi site operasional instalasi unit.

| Method | Endpoint | Deskripsi | Query Params / Body |
|:---|:---|:---|:---|
| `GET` | `/locations` | Daftar lokasi paginasi | `?page=1&limit=10&search=&isActive=all` |
| `GET` | `/locations/:id` | Detail lokasi | ID UUID |
| `POST` | `/locations` | Tambah lokasi baru | `{ "name": "Site Tambang Sebuku", "isActive": true }` |
| `PATCH` / `PUT` | `/locations/:id` | Edit data lokasi | `{ "name": "Site Tambang Sebuku Area A", "isActive": true }` |
| `DELETE` | `/locations/:id` | Hapus lokasi | ID UUID |

---

### 5.3 Component Module (`/components`)

Mengelola data kategori modul/komponen mesin Load Scanner (seperti Mini PC, Sensor LiDAR, Kamera, Kontroler, Power Supply).

| Method | Endpoint | Deskripsi | Query Params / Body |
|:---|:---|:---|:---|
| `GET` | `/components` | Daftar komponen | `?page=1&limit=10&search=&isActive=all` |
| `GET` | `/components/:id` | Detail komponen | ID UUID |
| `POST` | `/components` | Tambah komponen | `{ "prefix": "LID", "name": "Sensor LiDAR", "sortOrder": 1, "isActive": true }` |
| `PATCH` / `PUT` | `/components/:id` | Edit komponen | `{ "prefix": "LID", "name": "Sensor LiDAR v2", "sortOrder": 1, "isActive": true }` |
| `DELETE` | `/components/:id` | Hapus komponen | ID UUID |

* **`prefix`** *(String, wajib, max 20)*: Kode awalan failure code, otomatis ditransformasi ke huruf kapital (uppercase), misal `LID`, `MPC`, `CAM`.
* **`name`** *(String, wajib, max 100)*: Nama modul komponen.
* **`sortOrder`** *(Integer, opsional, default `0`)*: Urutan tampilan pada antarmuka.
* **`isActive`** *(Boolean, opsional, default `true`)*: Status keaktifan komponen.

---

### 5.4 Failure Code Module (`/failure-codes`)

Mengelola master kode kerusakan/kesalahan teknis spesifik pada suatu komponen.

| Method | Endpoint | Deskripsi | Query Params / Body |
|:---|:---|:---|:---|
| `GET` | `/failure-codes` | Daftar failure code | `?page=1&limit=10&search=&componentId=&isActive=all` |
| `GET` | `/failure-codes/:id` | Detail failure code | ID UUID |
| `POST` | `/failure-codes` | Tambah failure code | `{ "componentId": "<uuid>", "code": "LID-01", "description": "No point cloud stream", "isActive": true }` |
| `PATCH` / `PUT` | `/failure-codes/:id` | Edit failure code | `{ "code": "LID-01A", "description": "LiDAR disconnected", "isActive": true }` |
| `DELETE` | `/failure-codes/:id` | Hapus failure code | ID UUID |

#### âŒ Contoh Error Duplikasi Kode Failure: `409 Conflict`
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Failure code 'LID-01' sudah terdaftar pada sistem"
}
```

---

### 5.5 Asset Module (`/assets`)

Mengelola master data aset unit mesin Load Scanner di lapangan.

| Method | Endpoint | Deskripsi | Query Params / Body |
|:---|:---|:---|:---|
| `GET` | `/assets` | Daftar unit aset | `?page=1&limit=10&clientId=&locationId=&type=&status=&search=&isActive=all` |
| `GET` | `/assets/:id` | Detail unit aset | ID UUID |
| `POST` | `/assets` | Tambah unit aset | Request body JSON lengkap di bawah |
| `PATCH` / `PUT` | `/assets/:id` | Edit unit aset | Partial request body JSON di bawah |
| `DELETE` | `/assets/:id` | Hapus unit aset | ID UUID |

#### Request Body Valid `POST /assets`
```json
{
  "unitCode": "UN-10023",
  "type": "portable",
  "clientId": "c1f7b7f1-88bc-4eb7-a720-3b9508bc5c6d",
  "locationId": "e2a8b9c0-1122-3344-5566-778899aabbcc",
  "status": "active",
  "commissioningDate": "2026-01-15",
  "isActive": true
}
```

* **`unitCode`** *(String, wajib, max 50)*: Kode nomor seri unit scanner (misal `UN-10023`).
* **`type`** *(String, wajib)*: Tipe unit (misal `"portable"` atau `"static"`).
* **`clientId`** *(UUID, wajib)*: ID relasi client pemilik aset.
* **`locationId`** *(UUID, wajib)*: ID relasi lokasi penempatan aset.
* **`status`** *(String, wajib)*: Status operasional aset (`active`, `maintenance`, `retired`).
* **`commissioningDate`** *(Tanggal `YYYY-MM-DD` atau ISO 8601, opsional)*: Tanggal instalasi resmi unit.
* **`isActive`** *(Boolean, opsional, default `true`)*: Status keaktifan aset.

---

## 6. Ticket Management Module (`/tickets`)

Mengelola siklus hidup tiket gangguan operasional Load Scanner (pelaporan, eskalasi ke tim software, penugasan tim, investigasi, hingga penyelesaian).

---

### `GET /tickets`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/tickets` |
| **Query Params** | `?page=1&limit=10&search=&status=&severity=&componentId=&clientId=&locationId=&unitCode=&startDate=&endDate=&sortBy=createdAt&sortOrder=desc` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Semua Role** (`admin`, `coordinator`, `viewer`) |

Mengambil daftar tiket dengan filter multi-kriteria dan pagination.

* **`page`** *(Integer, opsional, default `1`)*: Halaman data.
* **`limit`** *(Integer, opsional, default `10`)*: Batas data per halaman (maks. 1000).
* **`search`** *(String, opsional)*: Pencarian teks bebas pada ID tiket, unit code, deskripsi, atau failure code.
* **`status`** *(String enum, opsional)*: `"open"`, `"escalated"`, atau `"solved"`.
* **`severity`** *(String enum, opsional)*: `"rendah"`, `"sedang"`, atau `"tinggi"`.
* **`componentId`** *(UUID, opsional)*: Filter berdasarkan ID modul komponen.
* **`clientId`** *(UUID, opsional)*: Filter berdasarkan ID client.
* **`locationId`** *(UUID, opsional)*: Filter berdasarkan ID lokasi.
* **`unitCode`** *(String, opsional)*: Filter nomor unit scanner tertentu.
* **`startDate`** & **`endDate`** *(Tanggal `YYYY-MM-DD` atau ISO 8601, opsional)*: Filter rentang tanggal dibuat.
* **`sortBy`** *(Enum string, opsional, default `"createdAt"`)*: `"createdAt"`, `"id"`, atau `"ticketId"`.
* **`sortOrder`** *(Enum string, opsional, default `"desc"`)*: `"asc"` atau `"desc"`.

#### âŒ Contoh Error Query Parameter Input: `422 Unprocessable Entity`
Jika mengirimkan parameter status yang tidak dikenal:
```http
GET /tickets?status=unknown_status
```

```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "status",
      "message": "Status harus berupa open, escalated, atau solved"
    }
  ]
}
```

---

### `POST /tickets`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/tickets` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Semua Role** (`admin`, `coordinator`, `viewer`) |

Membuat tiket baru manual dari antarmuka dashboard.

#### Request Body Valid
```json
{
  "unitCode": "UN-10023",
  "failureCodeId": "f1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "componentId": "c1a2b3c4-d5e6-7890-abcd-ef1234567890",
  "damageDescription": "Sensor LiDAR tidak mengeluarkan data point cloud saat kendaraan lewat",
  "actionTaken": "Pembersihan lensa optik dan reboot power supply",
  "rootCause": null,
  "severity": "sedang",
  "status": "open"
}
```

* **`unitCode`** *(String, wajib)*: Kode unit mesin scanner.
* **`failureCodeId`** *(UUID, wajib)*: ID kode kegagalan.
* **`componentId`** *(UUID, opsional)*: ID komponen terkait.
* **`damageDescription`** *(String, opsional)*: Deskripsi gejala kerusakan.
* **`actionTaken`** *(String, opsional)*: Tindakan awal yang sudah dilakukan Aftersales.
* **`rootCause`** *(String, opsional)*: Akar penyebab masalah (jika diketahui).
* **`severity`** *(Enum string, opsional, default `"rendah"`)*: `"rendah"`, `"sedang"`, atau `"tinggi"`.
* **`status`** *(Enum string, opsional, default `"open"`)*: `"open"`, `"escalated"`, atau `"solved"`.

#### Response Sukses: `201 Created`
```json
{
  "success": true,
  "message": "Tiket berhasil dibuat",
  "data": {
    "ticket": {
      "id": "ERR-20261009-0001",
      "ticketId": "ERR-20261009-0001",
      "currentVersion": 0,
      "status": "open",
      "severity": "sedang",
      "unitCode": "UN-10023",
      "createdAt": "2026-10-09T08:30:00.000Z"
    }
  }
}
```

#### âŒ Contoh Input Kurang Lengkap: `422 Unprocessable Entity`
Jika tidak menyertakan `unitCode` atau `failureCodeId`:
```json
// Request Body yang Salah:
{
  "damageDescription": "LiDAR rusak"
}

// Response Error Server:
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "unitCode",
      "message": "Unit code wajib diisi"
    },
    {
      "field": "failureCodeId",
      "message": "Failure Code ID wajib diisi"
    }
  ]
}
```

---

### `GET /tickets/:id`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/tickets/:id` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Semua Role** (`admin`, `coordinator`, `viewer`) |

Mengambil data detail tiket berdasarkan ID tiket (termasuk unit, client, lokasi, riwayat terkini, leader assignee, dan daftar anggota tim software).

#### âœ… Contoh Respons Sukses: `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "ERR-20261007-0001",
    "ticketId": "ERR-20261007-0001",
    "currentVersion": 2,
    "unit": "UN-10023",
    "unitCode": "UN-10023",
    "unitType": "portable",
    "client": "PT Tambang Makmur",
    "location": "Site Batubara A",
    "component": "Sensor LiDAR",
    "failureCode": "LID-01",
    "failureName": "No Point Cloud Stream",
    "severity": "sedang",
    "status": "escalated",
    "reporter": "Budi Aftersales",
    "damageDescription": "Sensor mati mendadak saat operasi",
    "actionTaken": "Eskalasi ke tim software untuk debugging firmware",
    "rootCause": null,
    "leaderAssigneeId": "550e8400-e29b-41d4-a716-446655440001",
    "assignees": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "isLeader": true,
        "name": "Siti Software Leader",
        "identifier": "siti@erad.com"
      }
    ]
  }
}
```

#### âŒ Contoh Error Tiket Tidak Ditemukan: `404 Not Found`
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Tiket dengan ID 'ERR-99999999-0000' tidak ditemukan"
}
```

---

### `PATCH /tickets/:id`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `PATCH` |
| **Endpoint Path** | `/tickets/:id` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | Lihat Matriks Izin Pembaruan di bawah |

Memperbarui status penanganan, severity, catatan, atau rincian analisis teknis tiket. Setiap pembaruan menaikkan versi tiket (`currentVersion + 1`) dan membuat entri riwayat baru di `ticket_history`.

#### Request Body Valid
```json
{
  "status": "solved",
  "handlingNote": "Firmware driver LiDAR di-patch ke versi 2.4.1 dan kalibrasi ulang selesai.",
  "rootCause": "Race condition pada port serial driver",
  "severity": "sedang"
}
```

#### Matriks Izin Pembaruan Tiket (`PATCH /tickets/:id`)

| Divisi / Peran | Persyaratan Izin Update |
|:---|:---|
| **Aftersales** (`division: after_sales`) | **Bebas mengupdate** pada semua status (`open`, `escalated`, `solved`) tanpa perlu terdaftar di `ticket_assignees`. |
| **Software** (`division: software`) | **Hanya dapat mengupdate saat status tiket `escalated`** DAN **wajib terdaftar** di `ticket_assignees` tiket bersangkutan. |
| **Admin** (`role: admin`) | Memiliki akses penuh memperbarui tiket pada kondisi apa pun. |

#### âŒ Contoh Error Status Salah: `422 Unprocessable Entity`
```json
// Request Body yang Salah:
{
  "status": "closed"
}

// Response Error Server:
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "status",
      "message": "Status harus berupa open, escalated, atau solved"
    }
  ]
}
```

#### âŒ Error Tim Software Saat Status Tiket Bukan 'escalated': `400 Bad Request` / `403 Forbidden`
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Akses ditolak: Tim software hanya dapat melakukan perubahan ketika tiket berstatus 'escalated' (status saat ini: 'open')."
}
```

#### âŒ Error Tim Software Belum Terdaftar di Assignees: `403 Forbidden`
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Akses ditolak: Hanya anggota tim software yang terdaftar pada tiket ini yang dapat melakukan perubahan tiket. Silakan minta leader tim software untuk menambahkan Anda ke tiket."
}
```

---

### `POST /tickets/:id/claim`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/tickets/:id/claim` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | Tim Software (`division: software`) & Super Admin (`role: admin`) |

Mengambil alih (klaim) tiket yang berstatus `escalated` oleh anggota tim software.  
* **Klaim Pertama Menjadi Leader**: Anggota pertama yang mengklaim tiket otomatis ditetapkan sebagai **Leader tim Software** (`leader_assignee_id`), ditambahkan ke tabel `ticket_assignees` dengan `isLeader: true`, dan mencatat riwayat klaim di `ticket_history`.
* **Klaim Duplikat**: Jika tiket sudah memiliki leader lain, sistem menolak klaim baru dengan status `409 Conflict`. Anggota lain harus ditambahkan oleh leader tiket melalui `POST /tickets/:id/assignees`.

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "message": "Tiket berhasil diklaim sebagai Leader tim Software",
  "data": {
    "ticketId": "ERR-20261007-0001",
    "leaderAssigneeId": "550e8400-e29b-41d4-a716-446655440001",
    "status": "escalated"
  }
}
```

#### âŒ Error Klaim Tiket yang Sudah Ber-leader: `409 Conflict`
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Tiket ini sudah diklaim oleh leader tim software (Siti Software Leader). Hanya leader yang dapat menambahkan anggota tim."
}
```

---

### `GET /tickets/:id/assignees`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/tickets/:id/assignees` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Semua Role** (`admin`, `coordinator`, `viewer`) |

Mengambil daftar seluruh anggota tim software yang ditugaskan pada tiket, beserta penanda siapa yang menjadi Leader.

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "data": {
    "assignees": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "ticketId": "ERR-20261007-0001",
        "isLeader": true,
        "name": "Siti Software Leader",
        "email": "siti@erad.com",
        "role": "coordinator",
        "division": "software"
      },
      {
        "id": "550e8400-e29b-41d4-a716-446655440002",
        "ticketId": "ERR-20261007-0001",
        "isLeader": false,
        "name": "Joko Engineer",
        "email": "joko@erad.com",
        "role": "coordinator",
        "division": "software"
      }
    ]
  }
}
```

---

### `POST /tickets/:id/assignees`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/tickets/:id/assignees` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Hak Akses** | **Leader Tiket** (atau Super Admin) |

Menambahkan anggota tim software baru ke tiket.
* **Aturan Bisnis**:
  * Tiket harus berstatus `escalated`.
  * Hanya dapat dieksekusi oleh **Leader tiket saat ini** (atau Super Admin).
  * Anggota yang ditambahkan harus berasal dari divisi `software`.

#### Request Body (Pilih salah satu identifier)
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440002"
}
```
Atau via email / Telegram:
```json
{
  "email": "joko@erad.com"
}
```
Atau:
```json
{
  "telegramId": "987654321"
}
```

#### âŒ Contoh Error: Bukan Leader (`403 Forbidden`)
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Akses ditolak: Hanya Leader tiket yang dapat menambahkan anggota tim software."
}
```

---

### `PATCH /tickets/:id/assignees/:assigneeId` & `PUT /tickets/:id/assignees/:assigneeId`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `PATCH`, `PUT` |
| **Endpoint Path** | `/tickets/:id/assignees/:assigneeId` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Hak Akses** | **Leader Tiket** (atau Super Admin) |

Mengedit atau memperbarui data anggota tim software yang terdaftar di tiket (misal mengganti anggota dengan user software lain).

---

### `PATCH /tickets/:id/leader`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `PATCH` |
| **Endpoint Path** | `/tickets/:id/leader` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Hak Akses** | **Leader Tiket Saat Ini** (atau Super Admin) |

Mengalihkan peran kepemimpinan (Leader) tiket ke anggota tim software lain yang sudah terdaftar di `ticket_assignees`.

#### Request Body
```json
{
  "assigneeId": "550e8400-e29b-41d4-a716-446655440002"
}
```

---

### `DELETE /tickets/:id/assignees/:assigneeId`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `DELETE` |
| **Endpoint Path** | `/tickets/:id/assignees/:assigneeId` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Hak Akses** | **Leader Tiket**, Admin, atau Anggota bersangkutan |

Menghapus keikutsertaan anggota dari tiket.
* **Keamanan Data**: Riwayat perubahan yang pernah dicatat oleh anggota ini di `ticket_history` **tetap aman dan ter-record** lengkap dengan nama dan ID penulis aslinya.
* **Aturan Leader**: Jika Leader ingin keluar/dihapus dan masih ada anggota lain di tiket, Leader wajib mengalihkan kepemimpinan terlebih dahulu via `PATCH /tickets/:id/leader`.

---

### `GET /tickets/:id/history`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/tickets/:id/history` |
| **Query Params** | `?order=desc` (default) atau `?order=asc` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Semua Role** (`admin`, `coordinator`, `viewer`) |

Mengambil seluruh linimasa riwayat perubahan tiket (`ticket_history`) dari versi awal (v0) hingga versi terkini.

#### âœ… Contoh Respons Sukses: `200 OK`
```json
{
  "success": true,
  "data": {
    "ticketId": "ERR-20261007-0001",
    "currentVersion": 2,
    "totalRecords": 3,
    "history": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "ticketId": "ERR-20261007-0001",
        "version": 2,
        "status": "escalated",
        "action": "Tiket diklaim oleh Siti Software Leader sebagai Leader tim Software",
        "notes": "Tiket diklaim oleh Siti Software Leader sebagai Leader tim Software",
        "author": "Siti Software Leader",
        "authorRole": "coordinator",
        "authorDivision": "software",
        "source": "web",
        "changedByUserId": "550e8400-e29b-41d4-a716-446655440001",
        "changedByTelegramUserId": null,
        "timestamp": "07 Okt 2026, 10:15",
        "damageDescription": "Sensor mati mendadak saat operasi",
        "actionTaken": "Eskalasi ke tim software",
        "rootCause": null,
        "severity": "sedang"
      },
      {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "ticketId": "ERR-20261007-0001",
        "version": 1,
        "status": "escalated",
        "action": "Eskalasi ke software karena butuh bugfix firmware",
        "notes": "Eskalasi ke software karena butuh bugfix firmware",
        "author": "Budi Aftersales",
        "timestamp": "07 Okt 2026, 09:30"
      },
      {
        "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "ticketId": "ERR-20261007-0001",
        "version": 0,
        "status": "open",
        "action": "Tiket baru dibuat",
        "author": "Budi Aftersales",
        "timestamp": "07 Okt 2026, 09:00"
      }
    ]
  }
}
```

---

### `GET /tickets/:id/history/:version`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/tickets/:id/history/:version` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Semua Role** (`admin`, `coordinator`, `viewer`) |

Mengambil snapshot rincian kondisi tiket pada nomor versi tertentu.

---

### `POST /tickets/:id/comments`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/tickets/:id/comments` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Semua Role** (mengikuti aturan izin update tiket) |

Menambahkan catatan penanganan / komentar baru pada tiket. Aksi ini menaikkan versi tiket (`version + 1`) dan mencatat baris baru di `ticket_history`.

#### Request Body
```json
{
  "notes": "Pengecekan log driver selesai, mempersiapkan build firmware patch v2"
}
```

---

### `GET /tickets/stream`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **Server-Sent Events (SSE)** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/tickets/stream` |
| **Autentikasi** | `Authorization: Bearer <access_token>` atau `?token=<access_token>` |
| **Role Izin** | **Semua Role** (`admin`, `coordinator`, `viewer`) |

Koneksi streaming waktu nyata (real-time) yang memancarkan event saat tiket dibuat, diubah, dieskalasi, atau diselesaikan.

---

## 7. Coordinator Ticket Management Module (`/ticket-management`)

Modul operasional khusus untuk pengguna dengan peran **`coordinator`** untuk mengelola tiket penanganan sesuai tanggung jawab divisi masing-masing:
* **Divisi Aftersales (`division: "after_sales"`)**: Hanya menampilkan dan mengelola tiket berstatus **`open`** yang dibuat oleh dirinya sendiri (diverifikasi secara historis melalui `ticket_history` versi awal v0/v1).
* **Divisi Software (`division: "software"`)**: Hanya menampilkan dan mengelola tiket berstatus **`escalated`** di mana dirinya terdaftar aktif dalam daftar **`ticket_assignees`**.
* **Proteksi Akses**: Peran `admin` dan `viewer` dilarang mengakses modul ini (`403 Forbidden`).

---

### `GET /ticket-management`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/ticket-management` |
| **Query Params** | `?search=&severity=` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Hanya `coordinator`** (`after_sales` & `software`) |

Mengambil daftar tiket yang menjadi tanggung jawab koordinator yang sedang login beserta KPI ringkasan dan metadata koordinator.

* **`search`** *(String, opsional)*: Pencarian teks bebas pada ID tiket, unit, modul komponen, client, atau deskripsi kerusakan.
* **`severity`** *(String enum, opsional)*: `"rendah"`, `"sedang"`, atau `"tinggi"`.

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Berhasil mengambil tiket yang dikelola coordinator",
  "data": [
    {
      "id": "ERR-20261009-0005",
      "ticketId": "ERR-20261009-0005",
      "currentVersion": 2,
      "status": "Escalated",
      "rawStatus": "escalated",
      "severity": "Tinggi",
      "rawSeverity": "tinggi",
      "unit": "LS-PRO-01",
      "client": "PT Mineral Abadi",
      "location": "Site Halmahera",
      "component": "LiDAR Sensor",
      "failureCode": "LID-ERR-001",
      "damageDescription": "Point cloud terputus saat vibrasi tinggi",
      "actionTaken": "Tiket diklaim oleh Siti Software Leader (Leader Software)",
      "leaderAssigneeId": "ca2823c5-d250-47de-9238-991d33afb896",
      "assignees": [
        {
          "id": "ca2823c5-d250-47de-9238-991d33afb896",
          "name": "Siti Software Leader",
          "identifier": "siti@erad.id",
          "isLeader": true,
          "userId": "9815d440-bd3c-46d7-856d-74644f7891dd"
        }
      ],
      "createdAt": "2026-10-09T08:00:00.000Z"
    }
  ],
  "meta": {
    "total": 1,
    "division": "software",
    "coordinatorName": "Siti Software Leader",
    "coordinatorEmail": "siti@erad.id"
  },
  "kpi": {
    "total": 1,
    "highSeverityCount": 1,
    "targetDivision": "Tim Software (Status Escalated & Assigned)"
  }
}
```

#### âŒ Contoh Akses Ditolak untuk Non-Coordinator: `403 Forbidden`
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Akses ditolak: Menu manajemen tiket hanya dapat diakses oleh peran Coordinator."
}
```

---

### `PATCH /ticket-management/:id`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `PATCH` |
| **Endpoint Path** | `/ticket-management/:id` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Hanya `coordinator`** |

Memperbarui status, penanganan, atau catatan tiket yang sedang dikelola. Aksi ini secara otomatis menaikkan versi tiket (`version + 1`), mencatat entri baru ke `ticket_history`, dan mencatat riwayat audit log.

#### Request Body
```json
{
  "status": "escalated",
  "severity": "tinggi",
  "damageDescription": "Sensor LiDAR tidak mengeluarkan data point cloud saat kendaraan lewat",
  "actionTaken": "Patch driver v2.1 diaplikasikan, verifikasi firmware selesai",
  "rootCause": "Race condition pada serial buffer COM4",
  "notes": "Update progres investigasi modul LiDAR"
}
```

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Tiket ERR-20261009-0005 berhasil diperbarui ke versi 3",
  "data": {
    "id": "ERR-20261009-0005",
    "currentVersion": 3,
    "status": "Escalated",
    "severity": "Tinggi",
    "actionTaken": "Patch driver v2.1 diaplikasikan, verifikasi firmware selesai",
    "notes": "Update progres investigasi modul LiDAR",
    "updatedAt": "2026-10-09T08:35:00.000Z"
  }
}
```

---

### `POST /ticket-management/:id/assignees`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/ticket-management/:id/assignees` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **`coordinator`** (Leader tim Software atau Koordinator) |

Menambahkan anggota tim software baru ke dalam tiket (`ticket_assignees`).

**Aturan Bisnis & Validasi:**
1. Tiket harus berada pada status **`escalated`**.
2. Anggota yang ditambahkan harus berasal dari **divisi software** (atau admin/coordinator).
3. Mendukung penugasan anggota dari akun **Web Dashboard** (`userId` / `email`) maupun akun **Telegram Whitelist** (`telegramUserId` / `telegramId`).
4. Anggota yang sudah terdaftar tidak dapat ditambahkan ulang (duplikasi ditolak dengan status `409 Conflict`).
5. Jika `isLeader: true` dipilih, peran kepemimpinan tiket (`leader_assignee_id`) akan dialihkan ke anggota baru tersebut.
6. Aksi ini menaikkan versi tiket (`version + 1`), mencatat nama anggota yang ditambahkan ke `ticket_history`, dan menyiarkan event SSE `ticket_updated`.

#### Request Body (Pilihan 1: Menambahkan Akun Web Dashboard)
```json
{
  "userId": "96f93896-044f-4a3f-8f11-df90fd9a7612",
  "isLeader": false
}
```

#### Request Body (Pilihan 2: Menambahkan Pengguna Telegram Whitelist)
```json
{
  "telegramUserId": "c3da5963-8482-4537-b3b0-10ee93126284",
  "isLeader": false
}
```

#### Response Sukses: `201 Created`
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Anggota tim software 'Doni Kurniawan' berhasil ditambahkan ke tiket",
  "data": {
    "message": "Anggota tim software 'Doni Kurniawan' berhasil ditambahkan ke tiket",
    "assignee": {
      "id": "e2f1a0b3-1122-4455-8899-aabbccddeeff",
      "ticketId": "ERR-20261009-0005",
      "userId": null,
      "telegramUserId": "c3da5963-8482-4537-b3b0-10ee93126284",
      "createdAt": "2026-10-09T08:40:00.000Z"
    },
    "ticket": {
      "id": "ERR-20261009-0005",
      "currentVersion": 3,
      "status": "Escalated"
    }
  }
}
```

#### âŒ Contoh Anggota Sudah Terdaftar: `409 Conflict`
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Anggota tersebut sudah terdaftar dalam ticket assignees tiket ini."
}
```

#### âŒ Contoh Tiket Belum Escalated: `403 Forbidden`
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Akses ditolak: Penambahan anggota tim software hanya dapat dilakukan ketika tiket berstatus 'escalated' (status saat ini: 'open')."
}
```

---

### `DELETE /ticket-management/:id/assignees/:assigneeId`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `DELETE` |
| **Endpoint Path** | `/ticket-management/:id/assignees/:assigneeId` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **`coordinator`** (Leader tiket, Koordinator, atau Anggota bersangkutan) |

Menghapus penugasan anggota tim software dari tiket.
* Jika anggota yang dihapus merupakan Leader saat ini, kepemimpinan tiket secara otomatis dialihkan ke anggota berikutnya yang terdaftar.
* Rekam jejak di `ticket_history` tetap utuh dan mencatat riwayat penghapusan keanggotaan tiket.

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Anggota 'Doni Kurniawan' berhasil dihapus dari tiket",
  "data": {
    "message": "Anggota 'Doni Kurniawan' berhasil dihapus dari tiket",
    "ticket": {
      "id": "ERR-20261009-0005",
      "currentVersion": 4,
      "status": "Escalated"
    }
  }
}
```

---

## 8. Export Module (`/exports` & `/tickets/export`)

Modul untuk mengunduh rekapitulasi data tiket dalam bentuk dokumen Excel (.xlsx) atau PDF (.pdf).

| Method | Endpoint | Deskripsi | Query Params |
|:---|:---|:---|:---|
| `GET` | `/exports/excel` | Download laporan tiket Excel | `?status=&severity=&search=&startDate=&endDate=` |
| `GET` | `/exports/pdf` | Download laporan tiket PDF | `?status=&severity=&search=&startDate=&endDate=` |
| `GET` | `/tickets/export/excel` | Alias download Excel langsung dari rute tickets | `?status=&severity=&search=&startDate=&endDate=` |
| `GET` | `/tickets/export/pdf` | Alias download PDF langsung dari rute tickets | `?status=&severity=&search=&startDate=&endDate=` |

* **Autentikasi**: Mendukung header `Authorization: Bearer <access_token>` atau via query param URL `?token=<access_token>` (memudahkan download via link `<a>` browser).
* **Role Izin**: Semua Role (`admin`, `coordinator`, `viewer`).

---

## 9. Audit Log Module (`/audit-logs`)

Mencatat seluruh rekam jejak aktivitas penting pengguna dan bot (tambah akun, edit role, ubah status tiket, login).

| Method | Endpoint | Deskripsi | Query Params |
|:---|:---|:---|:---|
| `GET` | `/audit-logs` | Daftar log audit terpaginasi | `?page=1&limit=10&search=&action=&entityType=&startDate=&endDate=` |
| `GET` | `/audit-logs/:id` | Detail satu entri catatan audit log | ID UUID |
| `GET` | `/audit-logs/stream` | Real-time SSE streaming aktivitas audit | `?token=<access_token>` atau Bearer header |

* **Role Izin**: Semua Role (`admin`, `coordinator`, `viewer`).

---

## 10. Summary & Error Analytics Modules

Menyediakan metrik agregasi untuk visualisasi statistik kartu dan grafik pada Dashboard Overview.

### `GET /summary` & `GET /error-analytics`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/summary` & `/error-analytics` |
| **Query Params** | `?timeRange=30d` (pilihan: `30d`, `90d`, `6m`, `all`) |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Semua Role** (`admin`, `coordinator`, `viewer`) |

#### âŒ Contoh Error Filter timeRange Tidak Valid: `422 Unprocessable Entity`
Jika mengirim query filter `?timeRange=10tahun`:
```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "timeRange",
      "message": "timeRange harus salah satu dari: 30d, 90d, 6m, all"
    }
  ]
}
```

---

## 11. Daftar Kode Status Error HTTP & Penjelasan

| Status Code | Label Standar | Penyebab & Skenario Error | Contoh Respons JSON |
|:---:|:---|:---|:---|
| `400` | **Bad Request** | Sintaks request salah, mencoba mengubah status user menjadi `invited`, atau foreign key constraint melarang operasi. | `{"success":false,"statusCode":400,"message":"Status tidak dapat diubah ke 'invited'. Opsi status hanya 'active' atau 'suspended'."}` |
| `401` | **Unauthorized** | Token tidak dikirim, token expired, atau kata sandi login salah. | `{"success":false,"statusCode":401,"message":"Email atau password salah. Sisa kesempatan login: 3 kali."}` |
| `403` | **Forbidden** | Akun dinonaktifkan (`suspended`), peran pengguna tidak memiliki izin (misal Viewer mencoba tambah user atau akses manajemen tiket), atau tim software mencoba edit tiket non-escalated. | `{"success":false,"statusCode":403,"message":"Akses dilarang: Peran tidak memiliki izin yang cukup"}` |
| `404` | **Not Found** | ID data atau endpoint URL tidak ditemukan. | `{"success":false,"statusCode":404,"message":"Tiket dengan ID tersebut tidak ditemukan"}` |
| `409` | **Conflict** | Terjadi duplikasi data unik (email sudah terdaftar, telegramId sudah ada, tiket sudah diklaim oleh leader lain, atau anggota sudah terdaftar di tiket). | `{"success":false,"statusCode":409,"message":"Email sudah terdaftar. Silakan gunakan email lain."}` |
| `422` | **Unprocessable Entity** | Validasi input skema Zod gagal (panjang kurang, format UUID salah, enum tidak cocok). | `{"success":false,"statusCode":422,"message":"Validation Error","details":[{"field":"status","message":"Status harus berupa open, escalated, atau solved"}]}` |
| `423` | **Locked** | Akun terkunci sementara selama 15 menit akibat 5 kali percobaan login berturut-turut gagal. | `{"success":false,"statusCode":423,"message":"Akun Anda terkunci selama 15 menit karena 5 kali percobaan login gagal."}` |
| `500` | **Internal Server Error** | Kesalahan sistem atau database yang tidak terduga pada server backend. | `{"success":false,"statusCode":500,"message":"Terjadi kesalahan internal pada server"}` |

