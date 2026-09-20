# API Documentation — After-Sales Monitoring System (ERAD)

Dokumentasi teknis resmi Application Programming Interface (API) untuk **Error Report Automation Dashboard (ERAD) / Load Scanner After-Sales Monitoring Platform**.

> **Base URL:** `http://[host]:[port]`  
> **Contoh Lingkungan Lokal:** `http://localhost:3000` atau `http://127.0.0.1:3000`

---

## 🌐 Protokol Komunikasi & Arsitektur Jaringan

Sistem ini menerapkan dua protokol komunikasi utama melalui HTTP standar:

1. **REST API (Representational State Transfer)**:
   - Digunakan untuk operasi transaksional CRUD standar, autentikasi, filtering data, manipulasi tiket, serta streaming file unduhan binary (Excel `.xlsx` dan PDF `.pdf`).
   - Berjalan di atas HTTP/1.1 dan HTTP/2 dengan format pertukaran data JSON (`application/json`).
   - Menggunakan HTTP Method standar: `GET`, `POST`, `PATCH`, `PUT`, dan `DELETE`.

2. **Server-Sent Events (SSE)**:
   - Digunakan untuk komunikasi *real-time* satu arah dari server ke antarmuka pengguna (*unidirectional server-to-client push*) melalui *media type* `text/event-stream`.
   - Terdapat 2 endpoint streaming SSE aktif:
     - `GET /tickets/stream`: Menyiarkan event pembuatan tiket baru (`ticket_created`), pembaruan status (`ticket_updated`), dan penambahan komentar (`ticket_comment_added`).
     - `GET /audit-logs/stream`: Menyiarkan event rekam jejak audit log (`log_created`) seketika saat aksi sistem terjadi.

3. **Catatan Arsitektur: Mengapa SSE, Bukan WebSocket?**:
   - **Karakteristik Kebutuhan**: Kebutuhan data real-time pada dashboard monitoring after-sales adalah *server push* (server memberitahu dashboard jika ada tiket atau log baru dari bot/lapangan). Tidak diperlukan komunikasi *bidirectional* frekuensi tinggi seperti pada game multipemain atau video call.
   - **Keandalan & Reconnection Bawaan**: SSE didukung secara native oleh browser melalui antarmuka W3C standard `EventSource` dengan mekanisme *automatic reconnection* bawaan jika koneksi terputus tanpa memerlukan library pihak ketiga yang berat.
   - **Firewall & Corporate Proxy Friendly**: SSE berjalan murni di atas koneksi HTTP biasa (Port 80/443), sehingga tidak akan diblokir oleh firewall kantor atau reverse proxy yang kerap memutus koneksi protokol WebSocket (`ws://` / `wss://`).
   - **Interaksi Balik yang Efisien**: Ketika client ingin merespons (misalnya mengubah status tiket atau menambah catatan penanganan), client cukup memanggil endpoint REST API biasa (`PATCH` / `POST`), dan hasilnya secara otomatis disiarkan ulang oleh server ke seluruh client melalui SSE.

---

## 📋 Tabel Direktori Endpoint & Protokol (Master API Directory)

Tabel berikut menyajikan seluruh endpoint yang tersedia pada sistem, metode HTTP, protokol yang digunakan, serta batasan izin peran (*role permissions*):

| No | Modul | Protokol | Method | Endpoint Path | Izin Role | Deskripsi Singkat |
|:---:|:---|:---:|:---:|:---|:---:|:---|
| 1 | **System** | REST API | `GET` | `/health` | Publik | Health check status service |
| 2 | **System** | REST API | `GET` | `/` | Publik | Service information & status |
| 3 | **Auth** | REST API | `POST` | `/auth/register` | Publik | Pendaftaran mandiri user baru |
| 4 | **Auth** | REST API | `POST` | `/auth/login` | Publik | Login email & password, set cookie refresh |
| 5 | **Auth** | REST API | `POST` | `/auth/refresh` | Publik (Cookie) | Rotasi dan perpanjangan access token |
| 6 | **Auth** | REST API | `POST` | `/auth/logout` | Terautentikasi | Hapus cookie refresh token & cabut sesi |
| 7 | **Auth** | REST API | `GET` | `/auth/me` | Terautentikasi | Ambil profil pengguna yang sedang login |
| 8 | **Auth** | REST API | `POST` | `/auth/change-password` | Terautentikasi | Ganti password akun sendiri |
| 9 | **Users** | REST API | `POST` | `/users` | `ADMIN`, `COORDINATOR` | Buat akun pengguna baru (pass: prefix+12345) |
| 10 | **Users** | REST API | `GET` | `/users` | Semua Role | Ambil daftar seluruh pengguna dashboard |
| 11 | **Users** | REST API | `GET` | `/users/:id` | Semua Role | Ambil detail satu pengguna |
| 12 | **Users** | REST API | `PATCH` | `/users/:id` | `ADMIN`, `COORDINATOR` | Ubah data pengguna (nama, email, role, status) |
| 13 | **Users** | REST API | `PUT` | `/users/:id` | `ADMIN`, `COORDINATOR` | Ubah data pengguna (alternatif PUT) |
| 14 | **Users** | REST API | `DELETE` | `/users/:id` | `ADMIN`, `COORDINATOR` | Hapus pengguna dashboard |
| 15 | **Telegram** | REST API | `POST` | `/telegram-users` | `ADMIN`, `COORDINATOR` | Tambah user Telegram ke whitelist bot |
| 16 | **Telegram** | REST API | `GET` | `/telegram-users` | Semua Role | Daftar user Telegram yang di-whitelist |
| 17 | **Telegram** | REST API | `GET` | `/telegram-users/:id` | Semua Role | Detail user Telegram whitelist |
| 18 | **Telegram** | REST API | `PATCH` | `/telegram-users/:id` | `ADMIN`, `COORDINATOR` | Update status/username user Telegram |
| 19 | **Telegram** | REST API | `DELETE` | `/telegram-users/:id` | `ADMIN`, `COORDINATOR` | Hapus user Telegram dari whitelist |
| 20 | **Master Client** | REST API | `GET` | `/clients` | Semua Role | Daftar client perusahaan |
| 21 | **Master Client** | REST API | `POST` | `/clients` | Semua Role | Tambah data client baru |
| 22 | **Master Client** | REST API | `GET` | `/clients/:id` | Semua Role | Detail client |
| 23 | **Master Client** | REST API | `PATCH` | `/clients/:id` | Semua Role | Perbarui data client |
| 24 | **Master Client** | REST API | `DELETE` | `/clients/:id` | Semua Role | Hapus data client |
| 25 | **Master Lokasi** | REST API | `GET` | `/locations` | Semua Role | Daftar lokasi operasional site |
| 26 | **Master Lokasi** | REST API | `POST` | `/locations` | Semua Role | Tambah lokasi baru |
| 27 | **Master Lokasi** | REST API | `GET` | `/locations/:id` | Semua Role | Detail lokasi |
| 28 | **Master Lokasi** | REST API | `PATCH` | `/locations/:id` | Semua Role | Perbarui data lokasi |
| 29 | **Master Lokasi** | REST API | `DELETE` | `/locations/:id` | Semua Role | Hapus data lokasi |
| 30 | **Master Komponen** | REST API | `GET` | `/components` | Semua Role | Daftar master komponen mesin/robot |
| 31 | **Master Komponen** | REST API | `POST` | `/components` | Semua Role | Tambah komponen baru |
| 32 | **Master Komponen** | REST API | `GET` | `/components/:id` | Semua Role | Detail komponen |
| 33 | **Master Komponen** | REST API | `PATCH` | `/components/:id` | Semua Role | Perbarui data komponen |
| 34 | **Master Komponen** | REST API | `DELETE` | `/components/:id` | Semua Role | Hapus data komponen |
| 35 | **Master Failure** | REST API | `GET` | `/failure-codes` | Semua Role | Daftar failure code kerusakan |
| 36 | **Master Failure** | REST API | `POST` | `/failure-codes` | Semua Role | Tambah failure code baru |
| 37 | **Master Failure** | REST API | `GET` | `/failure-codes/:id` | Semua Role | Detail failure code |
| 38 | **Master Failure** | REST API | `PATCH` | `/failure-codes/:id` | Semua Role | Perbarui data failure code |
| 39 | **Master Failure** | REST API | `DELETE` | `/failure-codes/:id` | Semua Role | Hapus data failure code |
| 40 | **Master Asset** | REST API | `GET` | `/assets` | Semua Role | Daftar unit Load Scanner |
| 41 | **Master Asset** | REST API | `POST` | `/assets` | Semua Role | Tambah unit Load Scanner baru |
| 42 | **Master Asset** | REST API | `GET` | `/assets/:id` | Semua Role | Detail unit Load Scanner |
| 43 | **Master Asset** | REST API | `PATCH` | `/assets/:id` | Semua Role | Perbarui unit Load Scanner |
| 44 | **Master Asset** | REST API | `DELETE` | `/assets/:id` | Semua Role | Hapus unit Load Scanner |
| 45 | **Tiket** | **SSE Stream** | `GET` | `/tickets/stream` | Semua Role | Real-time live update stream tiket |
| 46 | **Tiket** | REST API | `GET` | `/tickets` | Semua Role | Ambil daftar tiket dengan filter & paginasi |
| 47 | **Tiket** | REST API | `GET` | `/tickets/:id` | Semua Role | Detail tiket lengkap riwayat & komentar |
| 48 | **Tiket** | REST API | `PATCH` | `/tickets/:id` | Semua Role | Update status tiket / penanganan |
| 49 | **Tiket** | REST API | `POST` | `/tickets/:id/comments` | Semua Role | Tambah catatan penanganan ke tiket |
| 50 | **Tiket** | REST API | `POST` | `/tickets` | Semua Role | Buat tiket baru dari dashboard |
| 51 | **Export** | REST API | `GET` | `/exports/excel` | Semua Role | Download rekapitulasi file Excel (`.xlsx`) |
| 52 | **Export** | REST API | `GET` | `/exports/pdf` | Semua Role | Download rekapitulasi file PDF (`.pdf`) |
| 53 | **Audit Log** | **SSE Stream** | `GET` | `/audit-logs/stream` | Semua Role | Real-time live stream audit log |
| 54 | **Audit Log** | REST API | `GET` | `/audit-logs` | Semua Role | Daftar rekam jejak audit log |
| 55 | **Audit Log** | REST API | `GET` | `/audit-logs/:id` | Semua Role | Detail satu rekam jejak audit |
| 56 | **Ringkasan** | REST API | `GET` | `/summary` | Semua Role | KPI, tren bulanan, top ranking kerusakan |
| 57 | **Analitik** | REST API | `GET` | `/error-analytics` | Semua Role | Pareto, heatmap unit vs komponen, dsb. |

---

## 🔒 Konvensi Umum & Struktur Error Response

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
  "role": "VIEWER"
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
      "role": "VIEWER",
      "status": "ACTIVE",
      "mustChangePassword": false,
      "createdAt": "2026-09-21T05:30:00.000Z"
    }
  }
}
```

#### ❌ Contoh Input Error & Response: `422 Unprocessable Entity`
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
      "message": "Minimal 6 karakter"
    },
    {
      "field": "name",
      "message": "Minimal 2 karakter"
    }
  ]
}
```

#### ❌ Contoh Error Duplikasi Email: `409 Conflict`
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

#### Request Body Valid
```json
{
  "email": "admin@widya.com",
  "password": "password123"
}
```

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {
      "id": "48247728-9cfe-4789-a01f-bd27ad0272a1",
      "email": "admin@widya.com",
      "name": "Super Admin",
      "role": "ADMIN",
      "status": "ACTIVE",
      "mustChangePassword": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### ❌ Contoh Error Password Salah: `401 Unauthorized`
Menampilkan sisa percobaan login sebelum akun terkunci:
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Email atau password salah. Sisa kesempatan login: 4 kali."
}
```

#### ❌ Contoh Error Akun Terkunci (Account Lockout): `423 Locked`
Terjadi jika pengguna gagal memasukkan password sebanyak 5 kali berturut-turut:
```json
{
  "success": false,
  "statusCode": 423,
  "message": "Akun Anda terkunci selama 15 menit karena 5 kali percobaan login gagal."
}
```

#### ❌ Contoh Error Akun Dinonaktifkan: `403 Forbidden`
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

Menerbitkan Access Token baru menggunakan cookie `refreshToken`.

#### Response Sukses: `200 OK`
```json
{
  "success": true,
  "message": "Token berhasil diperbarui",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "48247728-9cfe-4789-a01f-bd27ad0272a1",
      "email": "admin@widya.com",
      "name": "Super Admin",
      "role": "ADMIN"
    }
  }
}
```

#### ❌ Contoh Error Refresh Token Kedaluwarsa / Hilang: `401 Unauthorized`
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Refresh token tidak valid atau telah kedaluwarsa"
}
```

---

### `POST /auth/change-password`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/auth/change-password` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | Semua Pengguna Terautentikasi |

Mengubah kata sandi akun pengguna yang sedang aktif.

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
  "message": "Password berhasil diperbarui. Silakan login kembali dengan password baru."
}
```

#### ❌ Contoh Error Konfirmasi Tidak Cocok: `422 Unprocessable Entity`
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

#### ❌ Contoh Error Password Lama Salah: `401 Unauthorized`
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Password saat ini tidak cocok"
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
| **Role Izin** | `ADMIN`, `COORDINATOR` |

Mendaftarkan akun pengguna dashboard baru. Password awal otomatis dibuat dengan pola: **nama email sebelum `@` + `12345`** (contoh: `joko@gmail.com` $\rightarrow$ `joko12345`).

#### Request Body Valid
```json
{
  "email": "joko@gmail.com",
  "name": "Joko Susilo",
  "role": "COORDINATOR"
}
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
      "role": "COORDINATOR",
      "status": "ACTIVE",
      "mustChangePassword": true,
      "createdById": "admin-uuid-1234",
      "createdAt": "2026-09-21T05:30:00.000Z"
    },
    "initialPassword": "joko12345"
  }
}
```

#### ❌ Contoh Input Error & Response: `422 Unprocessable Entity`
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

#### ❌ Contoh Akses Ditolak untuk Viewer: `403 Forbidden`
Jika pengguna dengan peran `VIEWER` mencoba membuat akun:
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Akses dilarang: Peran tidak memiliki izin yang cukup"
}
```

---

### `GET /users/:id`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/users/:id` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Semua Role** (`ADMIN`, `COORDINATOR`, `VIEWER`) |

#### ❌ Contoh Error Data Tidak Ditemukan: `404 Not Found`
Jika ID pengguna tidak terdaftar:
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Pengguna dengan ID tersebut tidak ditemukan"
}
```

---

### `PATCH /users/:id`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `PATCH` / `PUT` |
| **Endpoint Path** | `/users/:id` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | `ADMIN`, `COORDINATOR` |

#### ❌ Contoh Error Modifikasi Akun Sendiri: `400 Bad Request`
Jika admin/koordinator mencoba mendemosi role atau menonaktifkan status akunnya sendiri:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Anda tidak dapat menonaktifkan akun Anda sendiri demi menjaga integritas akses sistem"
}
```

#### ❌ Contoh Error Body Kosong: `422 Unprocessable Entity`
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
| **Role Izin** | `ADMIN`, `COORDINATOR` |

#### ❌ Contoh Error Hapus Akun Sendiri: `400 Bad Request`
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Anda tidak dapat menghapus akun Anda sendiri"
}
```

---

## 4. Telegram Whitelist Module (`/telegram-users`)

Endpoint ini juga dapat diakses melalui alias path `/whitelist-telegram`.

### `POST /telegram-users`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `POST` |
| **Endpoint Path** | `/telegram-users` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | `ADMIN`, `COORDINATOR` |

Menambahkan akun Telegram ke whitelist bot.

#### Request Body Valid
```json
{
  "telegramId": "123456789",
  "username": "@john_doe",
  "fullName": "John Doe Tele",
  "isActive": true
}
```

#### ❌ Contoh Error Input Format: `422 Unprocessable Entity`
Jika `telegramId` berisi huruf abjad:
```json
// Request Body yang Salah:
{
  "telegramId": "bukan-angka-id",
  "fullName": "Budi"
}

// Response Error Server:
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "telegramId",
      "message": "ID Telegram harus berupa karakter angka numerik"
    }
  ]
}
```

#### ❌ Contoh Error Duplikasi Telegram ID: `409 Conflict`
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Telegram ID tersebut sudah terdaftar di whitelist"
}
```

---

## 5. Master Data Modules (`/clients`, `/locations`, `/components`, `/failure-codes`, `/assets`)

Seluruh entitas Master Data dapat diakses (baca maupun modifikasi CRUD) oleh **seluruh peran** (`ADMIN`, `COORDINATOR`, `VIEWER`).

### 5.1 Client Module (`/clients`)

#### Request Body Valid `POST /clients`
```json
{
  "name": "PT Sumber Rejeki Robotika",
  "isActive": true
}
```

#### ❌ Contoh Error Validasi Input: `422 Unprocessable Entity`
Jika nama client kosong atau terlalu pendek:
```json
// Request Body yang Salah:
{
  "name": "A"
}

// Response Error Server:
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "name",
      "message": "Nama client minimal 2 karakter"
    }
  ]
}
```

#### ❌ Contoh Error Foreign Key Constraint pada Penghapusan: `400 Bad Request`
Jika menghapus client yang masih memiliki aset unit terhubung:
```json
// Request:
DELETE /clients/c1f7b7f1-88bc-4eb7-a720-3b9508bc5c6d

// Response Error Server:
{
  "success": false,
  "statusCode": 400,
  "message": "Tidak dapat menghapus client karena masih terdapat 3 aset/unit Load Scanner yang terhubung. Nonaktifkan client (isActive: false) sebagai alternatif."
}
```

---

### 5.2 Failure Code Module (`/failure-codes`)

#### ❌ Contoh Error Input Foreign Key Component Tidak Valid: `422 Unprocessable Entity`
Jika format UUID komponen salah:
```json
// Request Body yang Salah:
{
  "code": "MPC-001",
  "description": "Mini PC hang",
  "componentId": "bukan-uuid-valid"
}

// Response Error Server:
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "componentId",
      "message": "Format Component ID harus berupa UUID valid"
    }
  ]
}
```

#### ❌ Contoh Error Duplikasi Kode Failure: `409 Conflict`
```json
{
  "success": false,
  "statusCode": 409,
  "message": "Failure code 'LID-003' sudah terdaftar pada sistem"
}
```

---

## 6. Ticket Management Module (`/tickets`)

### `GET /tickets`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/tickets` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Semua Role** (`ADMIN`, `COORDINATOR`, `VIEWER`) |

Mengambil daftar tiket dengan filter dan pagination.

#### ❌ Contoh Error Query Parameter Input: `422 Unprocessable Entity`
Jika mengirimkan parameter status yang tidak dikenal atau tanggal tidak valid:
```http
GET /tickets?status=unknown_status&startDate=2026-99-99
```

```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "status",
      "message": "Status harus berupa open, escalated, solved, atau closed"
    },
    {
      "field": "startDate",
      "message": "Format tanggal tidak valid"
    }
  ]
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
| **Role Izin** | **Semua Role** (`ADMIN`, `COORDINATOR`, `VIEWER`) |

Memperbarui penanganan tiket.

#### ❌ Contoh Error Status Salah: `422 Unprocessable Entity`
```json
// Request Body yang Salah:
{
  "status": "pending_approval"
}

// Response Error Server:
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "status",
      "message": "Status harus berupa open, escalated, solved, atau closed"
    }
  ]
}
```

#### ❌ Contoh Error Tiket Tidak Ditemukan: `404 Not Found`
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Tiket dengan ID 'TICK-99999999-0000' tidak ditemukan"
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
| **Role Izin** | **Semua Role** (`ADMIN`, `COORDINATOR`, `VIEWER`) |

Membuat tiket baru manual dari dashboard.

#### ❌ Contoh Input Kurang Lengkap: `422 Unprocessable Entity`
Jika tidak menyertakan kode unit atau ID failure code:
```json
// Request Body yang Salah:
{
  "damageDescription": "Lidar rusak"
}

// Response Error Server:
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "unitCode",
      "message": "Kode unit wajib disertakan"
    },
    {
      "field": "componentId",
      "message": "ID komponen wajib disertakan"
    },
    {
      "field": "failureCodeId",
      "message": "ID failure code wajib disertakan"
    }
  ]
}
```

---

## 7. Export Module (`/exports` & `/tickets/export`)

### `GET /exports/excel` & `GET /exports/pdf`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API (Binary Stream)** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/exports/excel` / `/exports/pdf` |
| **Autentikasi** | `Authorization: Bearer <access_token>` atau `?token=<access_token>` |
| **Role Izin** | **Semua Role** (`ADMIN`, `COORDINATOR`, `VIEWER`) |

Mengunduh dataset tiket dalam format binary file Excel atau PDF.

#### ❌ Contoh Error Tanpa Token: `401 Unauthorized`
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Akses ditolak: Access token tidak ditemukan atau format tidak valid"
}
```

---

## 8. Audit Log Module (`/audit-logs`)

### `GET /audit-logs/stream` (SSE Stream) & `GET /audit-logs` (REST API)

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **Server-Sent Events (SSE)** / **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/audit-logs/stream` & `/audit-logs` |
| **Autentikasi** | `Authorization: Bearer <access_token>` atau `?token=<access_token>` |
| **Role Izin** | **Semua Role** (`ADMIN`, `COORDINATOR`, `VIEWER`) |

#### ❌ Contoh Error Token Kedaluwarsa pada Stream SSE: `401 Unauthorized`
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Access token telah kedaluwarsa"
}
```

---

## 9. Summary & Error Analytics Modules

### `GET /summary` & `GET /error-analytics`

| Parameter | Spesifikasi |
|:---|:---|
| **Protokol** | **REST API** |
| **HTTP Method** | `GET` |
| **Endpoint Path** | `/summary` & `/error-analytics` |
| **Autentikasi** | `Authorization: Bearer <access_token>` |
| **Role Izin** | **Semua Role** (`ADMIN`, `COORDINATOR`, `VIEWER`) |

#### ❌ Contoh Error Filter timeRange Tidak Valid: `422 Unprocessable Entity`
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

## 10. Daftar Kode Status Error HTTP & Penjelasan

| Status Code | Label Standar | Penyebab & Skenario Error | Contoh Respons JSON |
|:---:|:---|:---|:---|
| `400` | **Bad Request** | Body JSON sintaks salah, atau constraint foreign key melarang penghapusan data. | `{"success":false,"statusCode":400,"message":"Tidak dapat menghapus client karena masih terdapat unit terhubung"}` |
| `401` | **Unauthorized** | Token tidak dikirim, token expired, atau kata sandi login salah. | `{"success":false,"statusCode":401,"message":"Email atau password salah. Sisa kesempatan login: 3 kali."}` |
| `403` | **Forbidden** | Akun dinonaktifkan (`SUSPENDED`), atau peran pengguna tidak memiliki hak akses (misal Viewer mencoba buat user). | `{"success":false,"statusCode":403,"message":"Akses dilarang: Peran tidak memiliki izin yang cukup"}` |
| `404` | **Not Found** | ID data atau endpoint URL tidak ditemukan. | `{"success":false,"statusCode":404,"message":"Pengguna dengan ID tersebut tidak ditemukan"}` |
| `409` | **Conflict** | Terjadi duplikasi data unik (email sudah terdaftar, telegramId sudah ada). | `{"success":false,"statusCode":409,"message":"Email sudah terdaftar. Silakan gunakan email lain."}` |
| `422` | **Unprocessable Entity** | Validasi input skema gagal (panjang kurang, format email salah, enum tidak cocok). | `{"success":false,"statusCode":422,"message":"Validation Error","details":[{"field":"email","message":"Format email tidak valid"}]}` |
| `423` | **Locked** | Akun terkunci sementara selama 15 menit akibat 5 kali percobaan login berturut-turut gagal. | `{"success":false,"statusCode":423,"message":"Akun Anda terkunci selama 15 menit karena 5 kali percobaan login gagal."}` |
| `500` | **Internal Server Error** | Kesalahan sistem atau database yang tidak terduga pada server backend. | `{"success":false,"statusCode":500,"message":"Terjadi kesalahan internal pada server"}` |
