# API Documentation — After-Sales Monitoring System

> Base URL: `http://[ip]:[port]` (contoh: `http://localhost:3000` atau `http://10.10.10.10:3000`)

---

## 📋 Daftar Isi

- [Konvensi Umum](#konvensi-umum)
- [Struktur Endpoint Direct (Tanpa Versi)](#struktur-endpoint-direct-tanpa-versi)
- [Health Check](#health-check)
- [Auth Module](#auth-module)
  - [Register (Self-Service)](#post-authregister)
  - [Login](#post-authlogin)
  - [Refresh Token](#post-authrefresh)
  - [Logout](#post-authlogout)
  - [Get Current User](#get-authme)
  - [Change Password (Ubah Password Sendiri)](#post-authchange-password)
- [User Management Module (Admin)](#user-management-module-admin)
  - [Create User Baru](#post-users)
  - [Daftar Pengguna](#get-users)
  - [Stream Real-time Data Pengguna (SSE)](#get-usersstream)
  - [Detail Pengguna](#get-usersid)
  - [Update Data Pengguna](#patch-usersid)
  - [Hapus Pengguna](#delete-usersid)
- [Telegram Whitelist Module (Admin)](#telegram-whitelist-module-admin)
  - [Tambah User Telegram ke Whitelist](#post-telegram-users)
  - [Daftar Whitelist User Telegram](#get-telegram-users)
  - [Detail User Telegram](#get-telegram-usersid)
  - [Edit Status & Data User Telegram](#patch-telegram-usersid)
  - [Hapus User Telegram dari Whitelist](#delete-telegram-usersid)
- [Error Response](#error-response)

---

## Konvensi Umum

### Format Response Sukses

```json
{
  "success": true,
  "message": "Deskripsi singkat",
  "data": { ... }
}
```

### Format Response Error

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Pesan error",
  "details": [ ... ],
  "stack": "... (hanya di mode development)"
}
```

### Autentikasi

Endpoint yang membutuhkan autentikasi menggunakan header `Authorization` dengan skema **Bearer Token**:

```
Authorization: Bearer <access_token>
```

### Cookie

Refresh token dikirim dan dibaca melalui **HttpOnly cookie** bernama `refreshToken`. Cookie ini otomatis di-set oleh server saat login dan refresh, serta dihapus saat logout.

---

## Struktur Endpoint Direct (Tanpa Versi)

Endpoint API diakses langsung seperti : `[ip]:[port]/[endpoint]`

Contoh:
- `http://10.10.10.10:3000/health`
- `http://10.10.10.10:3000/auth/login`
- `http://10.10.10.10:3000/users`

---

## Health Check

### `GET /health`

Memeriksa status server.

**Auth:** Tidak diperlukan

**Response: `200 OK`**

```json
{
  "status": "ok",
  "service": "error-service",
  "timestamp": "2026-09-15T07:10:00.000Z"
}
```

---

## Auth Module

### `POST /auth/register`

Mendaftarkan akun pengguna baru secara mandiri (*self-service*).

**Auth:** Tidak diperlukan

**Request Body:**

| Field | Tipe | Wajib | Validasi | Keterangan |
| :--- | :--- | :---: | :--- | :--- |
| `email` | `string` | ✅ | Format email valid | Di-trim dan di-lowercase otomatis |
| `password` | `string` | ✅ | Minimal 6 karakter | Disimpan dalam bentuk `password_hash` |
| `name` | `string` | ✅ | Minimal 2 karakter | Nama lengkap pengguna |
| `role` | `string` | ❌ | `"VIEWER"`, `"COORDINATOR"`, atau `"ADMIN"` | Default: `"VIEWER"` |

**Contoh Request:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "VIEWER"
}
```

**Response Sukses: `201 Created`**

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
      "createdAt": "2026-09-16T15:30:00.000Z"
    }
  }
}
```

---

### `POST /auth/login`

Login pengguna menggunakan email dan password. Mengembalikan Access Token di body dan men-set Refresh Token di HttpOnly cookie. Mendukung proteksi Account Lockout setelah 5 kali gagal berturut-turut (FR-SEC-01/02).

**Auth:** Tidak diperlukan

**Request Body:**

| Field | Tipe | Wajib | Validasi |
| :--- | :--- | :---: | :--- |
| `email` | `string` | ✅ | Format email valid |
| `password` | `string` | ✅ | Minimal 6 karakter |

**Contoh Request:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response Sukses: `200 OK`**

```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "user": {
      "id": "48247728-9cfe-4789-a01f-bd27ad0272a1",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "VIEWER",
      "status": "ACTIVE",
      "mustChangePassword": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Response Header (Set-Cookie):**

```
Set-Cookie: refreshToken=eyJ...; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax
```

**Response Error:**

| Status | Kondisi |
| :--- | :--- |
| `401 Unauthorized` | Email atau password salah (menampilkan sisa kesempatan), atau akun belum aktif |
| `403 Forbidden` | Akun telah dinonaktifkan (`status: "SUSPENDED"`) |
| `423 Locked` | Akun terkunci sementara selama 15 menit akibat 5x percobaan gagal (FR-SEC-01/02) |
| `422 Unprocessable Entity` | Validasi input gagal |

---

### `POST /auth/refresh`

Memperbarui Access Token menggunakan Refresh Token yang tersimpan di cookie. Mengimplementasikan **Refresh Token Rotation**: token lama di-revoke dan token baru diterbitkan.

**Auth:** Cookie `refreshToken` (otomatis dikirim browser)

**Request Body (alternatif, jika cookie tidak tersedia):**

```json
{
  "refreshToken": "eyJ..."
}
```

**Response Sukses: `200 OK`**

```json
{
  "success": true,
  "message": "Access token berhasil diperbarui",
  "data": {
    "user": {
      "id": "48247728-9cfe-4789-a01f-bd27ad0272a1",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "VIEWER",
      "status": "ACTIVE",
      "mustChangePassword": false
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### `POST /auth/logout`

Mencabut (revoke) refresh token di database dan menghapus cookie dari browser.

**Auth:** Cookie `refreshToken` (otomatis dikirim browser)

**Response Sukses: `200 OK`**

```json
{
  "success": true,
  "message": "Logout berhasil"
}
```

---

### `GET /auth/me`

Mengambil data profil pengguna yang sedang login berdasarkan Access Token.

**Auth:** `Authorization: Bearer <access_token>` ✅ **Wajib**

**Response Sukses: `200 OK`**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "48247728-9cfe-4789-a01f-bd27ad0272a1",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "VIEWER",
      "status": "ACTIVE",
      "mustChangePassword": false,
      "failedLoginAttempts": 0,
      "lockedUntil": null,
      "lastLoginAt": "2026-09-16T15:30:45.000Z",
      "passwordChangedAt": null,
      "createdAt": "2026-09-16T15:30:00.000Z",
      "updatedAt": "2026-09-16T15:30:45.000Z"
    }
  }
}
```

---

### `POST /auth/change-password`

Mengubah password akun pengguna yang sedang login. Mendukung method `POST` dan `PATCH`.

Setelah password berhasil diubah:
- Nilai `mustChangePassword` di database otomatis berubah menjadi `false`.
- Waktu perubahan dicatat di `passwordChangedAt`.
- Seluruh sesi login/refresh token di perangkat lain otomatis dicabut (*revoked*) untuk keamanan.
- Sesi aktif saat ini tetap berjalan dengan diterbitkannya pasangan access token baru dan refresh token baru pada cookie.

**Auth:** `Authorization: Bearer <access_token>` ✅ **Wajib**

**Request Body:**

| Field | Tipe | Wajib | Aturan | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| `currentPassword` | `string` | Ya | Minimal 1 karakter | Password lama yang sedang aktif |
| `newPassword` | `string` | Ya | Minimal 6 karakter, tidak boleh sama dengan password lama | Password baru yang diinginkan |
| `confirmPassword` | `string` | Tidak | Harus sama persis dengan `newPassword` | Konfirmasi password baru (opsional) |

```json
{
  "currentPassword": "passwordLama123",
  "newPassword": "passwordBaru456",
  "confirmPassword": "passwordBaru456"
}
```

**Response Sukses: `200 OK`**

```json
{
  "success": true,
  "message": "Password berhasil diubah",
  "data": {
    "user": {
      "id": "48247728-9cfe-4789-a01f-bd27ad0272a1",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "VIEWER",
      "status": "ACTIVE",
      "mustChangePassword": false,
      "passwordChangedAt": "2026-09-16T17:30:00.000Z",
      "updatedAt": "2026-09-16T17:30:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Kode Status HTTP:**

| Status Code | Kondisi |
| :--- | :--- |
| `200 OK` | Password berhasil diubah |
| `400 Bad Request` | Password saat ini salah, atau password baru sama dengan password lama |
| `401 Unauthorized` | Access token tidak disertakan atau sudah kedaluwarsa |
| `403 Forbidden` | Akun pengguna berstatus `SUSPENDED` |
| `422 Unprocessable Entity` | Validasi input gagal (panjang kurang dari 6 karakter / konfirmasi tidak cocok) |

---

## User Management Module (Admin)

### `POST /users`

Mendaftarkan pengguna baru oleh Admin. Password awal otomatis dibuat sama dengan **nama email sebelum tanda `@`** (contoh: `joko@gmail.com` $\rightarrow$ `joko`). Respons mengembalikan data user beserta `initialPassword` dalam bentuk plaintext agar Admin dapat memberikannya kepada user.

**Auth:** `Authorization: Bearer <admin_access_token>` ✅  
**Role Izin:** `ADMIN`

**Request Body:**

| Field | Tipe | Wajib | Pilihan Nilai | Keterangan |
| :--- | :--- | :---: | :--- | :--- |
| `email` | `string` | ✅ | Email valid | Contoh: `joko@gmail.com` |
| `name` | `string` | ✅ | Min 2 karakter | Nama lengkap |
| `role` | `string` | ❌ | `"ADMIN"`, `"COORDINATOR"`, `"VIEWER"` | Default: `"VIEWER"` |

**Contoh Request:**

```json
{
  "email": "joko@gmail.com",
  "name": "Joko Susilo",
  "role": "COORDINATOR"
}
```

**Response Sukses: `201 Created`**

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
      "createdAt": "2026-09-16T10:13:14.049Z"
    },
    "initialPassword": "joko"
  }
}
```

**Response Error:**

| Status | Kondisi |
| :--- | :--- |
| `401 Unauthorized` | Token tidak ada atau kedaluwarsa |
| `403 Forbidden` | Bukan role `ADMIN` |
| `409 Conflict` | Email sudah terdaftar |
| `422 Unprocessable Entity` | Validasi input gagal |

---

### `GET /users`

Mengambil daftar seluruh pengguna dengan fitur pencarian dan pagination.

**Auth:** `Authorization: Bearer <access_token>` ✅  
**Role Izin:** `ADMIN`

**Query Parameters (Opsional):**

| Parameter | Tipe | Default | Keterangan |
| :--- | :--- | :---: | :--- |
| `page` | `number` | `1` | Halaman data |
| `limit` | `number` | `10` | Jumlah data per halaman (maks: 100) |
| `search` | `string` | — | Cari berdasarkan nama atau email |
| `role` | `string` | — | Filter role (`ADMIN`, `COORDINATOR`, `VIEWER`) |
| `status` | `string` | — | Filter status (`ACTIVE`, `INVITED`, `SUSPENDED`) |

**Contoh Request:**

```
GET /users?page=1&limit=10&role=COORDINATOR
```

**Response Sukses: `200 OK`**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "981ba263-8103-4c76-a7ed-f241297e8b27",
        "email": "joko@gmail.com",
        "name": "Joko Susilo",
        "role": "COORDINATOR",
        "status": "ACTIVE",
        "mustChangePassword": true,
        "failedLoginAttempts": 0,
        "lockedUntil": null,
        "lastLoginAt": null,
        "createdAt": "2026-09-16T10:13:14.049Z",
        "updatedAt": "2026-09-16T10:13:14.049Z",
        "createdBy": {
          "id": "admin-uuid-1234",
          "name": "Super Admin",
          "email": "admin@widya.com"
        }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### `GET /users/stream` (atau `GET /users` dengan SSE)

Stream data pengguna secara **real-time menggunakan Server-Sent Events (SSE)**. Setiap kali terjadi perubahan data pengguna (Admin membuat user, mengubah data/role/status, atau menghapus user), server akan secara instan mem-broadcast data terbaru ke klien tanpa perlu browser me-refresh atau melakukan polling.

> [!TIP]
> Endpoint `GET /users` otomatis beralih ke mode SSE jika klien menyertakan header `Accept: text/event-stream` atau parameter query `?stream=true`.

**Auth:**  
- Header: `Authorization: Bearer <access_token>` ✅, **ATAU**
- Query Param: `?token=<access_token>` ✅ *(Sangat memudahkan penggunaan objek bawaan browser `new EventSource('/users/stream?token=...')`)*
**Role Izin:** `ADMIN`

**Response Headers:**
```http
Content-Type: text/event-stream
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no
```

**Daftar Event SSE yang Dikirim:**

| Event | Deskripsi | Format Payload (`data`) |
| :--- | :--- | :--- |
| `connected` | Dikirim saat koneksi SSE pertama kali terhubung | `{"status":"connected","timestamp":"..."}` |
| `initial` | Snapshot data seluruh pengguna saat ini | `{"users":[...],"pagination":{...}}` |
| `user:created` | Terpicu saat Admin mendaftarkan user baru | `{"user":{...}}` |
| `user:updated` | Terpicu saat Admin mengubah data user | `{"user":{...}}` |
| `user:deleted` | Terpicu saat Admin menghapus user | `{"id":"...","user":{...}}` |
| `users:refresh` | Daftar seluruh user yang sudah ter-refresh otomatis | `{"users":[...],"pagination":{...}}` |
| `message` | Event default bawaan browser (untuk `eventSource.onmessage`) | Berisi `type` dan data terkait |

**Contoh Penggunaan di Frontend (JavaScript / React):**

```javascript
const eventSource = new EventSource(`http://localhost:3000/users/stream?token=${accessToken}`);

// 1. Menerima data awal
eventSource.addEventListener("initial", (e) => {
  const data = JSON.parse(e.data);
  setUsers(data.users);
});

// 2. Menerima update otomatis saat data pengguna berubah
eventSource.addEventListener("users:refresh", (e) => {
  const data = JSON.parse(e.data);
  setUsers(data.users);
});

// 3. Menangani penutupan/error koneksi
eventSource.onerror = (err) => {
  console.error("SSE connection error:", err);
};
```

---

### `GET /users/:id`

Melihat detail lengkap satu akun pengguna berdasarkan ID (termasuk informasi siapa Admin yang membuatnya).

**Auth:** `Authorization: Bearer <access_token>` ✅  
**Role Izin:** `ADMIN`, `COORDINATOR`

**Contoh Request:**

```
GET /users/981ba263-8103-4c76-a7ed-f241297e8b27
```

**Response Sukses: `200 OK`**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "981ba263-8103-4c76-a7ed-f241297e8b27",
      "email": "joko@gmail.com",
      "name": "Joko Susilo",
      "role": "COORDINATOR",
      "status": "ACTIVE",
      "mustChangePassword": true,
      "failedLoginAttempts": 0,
      "lockedUntil": null,
      "lastLoginAt": null,
      "passwordChangedAt": null,
      "createdAt": "2026-09-16T10:13:14.049Z",
      "updatedAt": "2026-09-16T10:13:14.049Z",
      "createdBy": {
        "id": "admin-uuid-1234",
        "name": "Super Admin",
        "email": "admin@widya.com"
      }
    }
  }
}
```

---

### `PATCH /users/:id`

Memperbarui data pengguna tertentu oleh Admin. Mendukung method `PATCH` dan `PUT`. Admin dapat memperbarui satu atau beberapa field: `email`, `name`, `password`, `role`, dan `status`.

**Auth:** `Authorization: Bearer <admin_access_token>` ✅  
**Role Izin:** `ADMIN`

**Request Body (minimal 1 field diisi):**

| Field | Tipe | Wajib | Pilihan / Validasi | Keterangan |
| :--- | :--- | :---: | :--- | :--- |
| `email` | `string` | ❌ | Format email valid | Diperiksa agar tidak bentrok dengan email user lain |
| `name` | `string` | ❌ | Min 2 karakter | Nama lengkap baru |
| `password` | `string` | ❌ | Min 6 karakter | Otomatis di-hash dengan bcrypt |
| `role` | `string` | ❌ | `"ADMIN"`, `"COORDINATOR"`, `"VIEWER"` | Peran hak akses |
| `status` | `string` | ❌ | `"ACTIVE"`, `"INVITED"`, `"SUSPENDED"` | Status keaktifan akun |

> [!NOTE]
> - Jika `password` diubah atau status diubah menjadi `SUSPENDED`, seluruh refresh token milik user tersebut otomatis dicabut (*revoked*) untuk keamanan.
> - Admin tidak dapat menonaktifkan (`SUSPENDED`) atau mendemosi role akunnya sendiri demi mencegah penguncian sistem (*lockout*).

**Contoh Request:**

```json
{
  "name": "Joko Susilo, S.Kom",
  "role": "COORDINATOR",
  "status": "ACTIVE",
  "password": "newPasswordBaru123"
}
```

**Response Sukses: `200 OK`**

```json
{
  "success": true,
  "message": "Data pengguna berhasil diperbarui",
  "data": {
    "user": {
      "id": "981ba263-8103-4c76-a7ed-f241297e8b27",
      "email": "joko@gmail.com",
      "name": "Joko Susilo, S.Kom",
      "role": "COORDINATOR",
      "status": "ACTIVE",
      "mustChangePassword": false,
      "failedLoginAttempts": 0,
      "lockedUntil": null,
      "lastLoginAt": null,
      "passwordChangedAt": "2026-09-16T17:40:00.000Z",
      "createdAt": "2026-09-16T10:13:14.049Z",
      "updatedAt": "2026-09-16T17:40:00.000Z",
      "createdBy": {
        "id": "admin-uuid-1234",
        "name": "Super Admin",
        "email": "admin@widya.com"
      }
    }
  }
}
```

**Response Error:**

| Status Code | Kondisi |
| :--- | :--- |
| `400 Bad Request` | Admin mencoba menonaktifkan/mengubah role akunnya sendiri |
| `401 Unauthorized` | Token tidak disertakan atau sudah kedaluwarsa |
| `403 Forbidden` | Bukan role `ADMIN` |
| `404 Not Found` | Pengguna dengan ID tersebut tidak ditemukan |
| `409 Conflict` | Email baru sudah digunakan oleh pengguna lain |
| `422 Unprocessable Entity` | Validasi input gagal (password < 6 karakter, enum salah, atau body kosong) |

---

### `DELETE /users/:id`

Menghapus akun pengguna dari sistem secara permanen. Seluruh sesi login, token reset password, serta relasi data terkait akan dibersihkan secara aman melalui database transaction.

**Auth:** `Authorization: Bearer <admin_access_token>` ✅  
**Role Izin:** `ADMIN`

> [!WARNING]
> Admin tidak dapat menghapus akun miliknya sendiri (`self-deletion prevention`).

**Contoh Request:**

```http
DELETE /users/981ba263-8103-4c76-a7ed-f241297e8b27
Authorization: Bearer <admin_access_token>
```

**Response Sukses: `200 OK`**

```json
{
  "success": true,
  "message": "Pengguna berhasil dihapus"
}
```

**Response Error:**

| Status Code | Kondisi |
| :--- | :--- |
| `400 Bad Request` | Admin mencoba menghapus akun miliknya sendiri |
| `401 Unauthorized` | Token tidak disertakan atau kedaluwarsa |
| `403 Forbidden` | Bukan role `ADMIN` |
| `404 Not Found` | Pengguna dengan ID tersebut tidak ditemukan |

---

## Telegram Whitelist Module (Admin)

Modul ini mengelola daftar putih (*whitelist*) pengguna Telegram yang diizinkan berinteraksi dengan Bot Notifikasi Error (FR-BOT-03). Seluruh endpoint pada modul ini **hanya dapat diakses oleh role `ADMIN`**.

---

### `POST /telegram-users`

Menambahkan pengguna Telegram baru ke dalam whitelist.

**Auth:** `Authorization: Bearer <admin_access_token>` ✅  
**Role Izin:** `ADMIN`

**Request Body:**

| Field | Tipe | Wajib | Keterangan |
| :--- | :--- | :---: | :--- |
| `telegramId` | `string` / `number` | ✅ | ID numerik unik pengguna Telegram (contoh: `"123456789"` atau `123456789`) |
| `username` | `string` | ❌ | Username Telegram (simbol `@` di depan otomatis dibersihkan) |
| `fullName` | `string` | ❌ | Nama lengkap pengguna untuk kemudahan identifikasi di dashboard |
| `isActive` | `boolean` | ❌ | Status keaktifan akses whitelist (default: `true`) |

**Contoh Request:**

```json
{
  "telegramId": "123456789",
  "username": "@john_doe",
  "fullName": "John Doe Tele",
  "isActive": true
}
```

**Response Sukses: `201 Created`**

```json
{
  "success": true,
  "message": "User Telegram berhasil ditambahkan ke whitelist",
  "data": {
    "telegramUser": {
      "id": "e81d7637-2fb0-4e5a-8b89-1df812d1b0d2",
      "telegramId": "123456789",
      "username": "john_doe",
      "fullName": "John Doe Tele",
      "isActive": true,
      "whitelistedById": "admin-uuid-1234",
      "createdAt": "2026-09-16T18:47:00.000Z",
      "updatedAt": "2026-09-16T18:47:00.000Z",
      "whitelistedBy": {
        "id": "admin-uuid-1234",
        "name": "Super Admin",
        "email": "admin@widya.com"
      }
    }
  }
}
```

**Response Error:**

| Status Code | Kondisi |
| :--- | :--- |
| `401 Unauthorized` | Token tidak disertakan atau kedaluwarsa |
| `403 Forbidden` | Bukan role `ADMIN` |
| `409 Conflict` | Telegram ID sudah terdaftar di whitelist |
| `422 Unprocessable Entity` | Validasi input gagal (telegramId tidak berupa angka numerik) |

---

### `GET /telegram-users`

Mengambil daftar seluruh pengguna Telegram di whitelist dengan pagination, pencarian, dan filter status aktif.

**Auth:** `Authorization: Bearer <admin_access_token>` ✅  
**Role Izin:** `ADMIN`

**Query Parameters (Opsional):**

| Parameter | Tipe | Default | Keterangan |
| :--- | :--- | :---: | :--- |
| `page` | `number` | `1` | Halaman data |
| `limit` | `number` | `10` | Jumlah data per halaman (maks: 100) |
| `search` | `string` | — | Cari berdasarkan `telegramId`, `username`, atau `fullName` |
| `isActive` | `boolean` | — | Filter status keaktifan (`true` atau `false`) |

**Response Sukses: `200 OK`**

```json
{
  "success": true,
  "data": {
    "telegramUsers": [
      {
        "id": "e81d7637-2fb0-4e5a-8b89-1df812d1b0d2",
        "telegramId": "123456789",
        "username": "john_doe",
        "fullName": "John Doe Tele",
        "isActive": true,
        "createdAt": "2026-09-16T18:47:00.000Z",
        "updatedAt": "2026-09-16T18:47:00.000Z",
        "whitelistedBy": {
          "id": "admin-uuid-1234",
          "name": "Super Admin",
          "email": "admin@widya.com"
        }
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

---

### `GET /telegram-users/:id`

Mengambil detail satu pengguna Telegram di whitelist berdasarkan ID internal.

**Auth:** `Authorization: Bearer <admin_access_token>` ✅  
**Role Izin:** `ADMIN`

**Response Sukses: `200 OK`**

```json
{
  "success": true,
  "data": {
    "telegramUser": {
      "id": "e81d7637-2fb0-4e5a-8b89-1df812d1b0d2",
      "telegramId": "123456789",
      "username": "john_doe",
      "fullName": "John Doe Tele",
      "isActive": true,
      "createdAt": "2026-09-16T18:47:00.000Z",
      "updatedAt": "2026-09-16T18:47:00.000Z",
      "whitelistedBy": {
        "id": "admin-uuid-1234",
        "name": "Super Admin",
        "email": "admin@widya.com"
      }
    }
  }
}
```

---

### `PATCH /telegram-users/:id`

Mengubah data atau status keaktifan pengguna Telegram di whitelist (`isActive`, `username`, `fullName`). Mendukung method `PATCH` dan `PUT`.

**Auth:** `Authorization: Bearer <admin_access_token>` ✅  
**Role Izin:** `ADMIN`

**Request Body (minimal 1 field):**

| Field | Tipe | Wajib | Keterangan |
| :--- | :--- | :---: | :--- |
| `isActive` | `boolean` | ❌ | Ubah status aktif/nonaktif (`true` / `false`) |
| `username` | `string` | ❌ | Username Telegram baru |
| `fullName` | `string` | ❌ | Nama lengkap baru |

**Contoh Request (Menonaktifkan Akses Telegram):**

```json
{
  "isActive": false
}
```

**Response Sukses: `200 OK`**

```json
{
  "success": true,
  "message": "Data user Telegram berhasil diperbarui",
  "data": {
    "telegramUser": {
      "id": "e81d7637-2fb0-4e5a-8b89-1df812d1b0d2",
      "telegramId": "123456789",
      "username": "john_doe",
      "fullName": "John Doe Tele",
      "isActive": false,
      "updatedAt": "2026-09-16T18:48:00.000Z"
    }
  }
}
```

---

### `DELETE /telegram-users/:id`

Menghapus pengguna Telegram dari daftar whitelist.

**Auth:** `Authorization: Bearer <admin_access_token>` ✅  
**Role Izin:** `ADMIN`

**Response Sukses: `200 OK`**

```json
{
  "success": true,
  "message": "User Telegram berhasil dihapus dari whitelist"
}
```

**Response Error:**

| Status Code | Kondisi |
| :--- | :--- |
| `401 Unauthorized` | Token tidak disertakan atau kedaluwarsa |
| `403 Forbidden` | Bukan role `ADMIN` |
| `404 Not Found` | User Telegram dengan ID tersebut tidak ditemukan |

---

## Error Response

### Kode Status yang Digunakan

| Status | Nama | Kapan Dipakai |
| :--- | :--- | :--- |
| `400` | Bad Request | JSON body tidak valid (syntax error) |
| `401` | Unauthorized | Token tidak ada, expired, atau invalid; password salah |
| `403` | Forbidden | Akun dinonaktifkan (`status: "SUSPENDED"`); role tidak memiliki izin (bukan Admin) |
| `404` | Not Found | Route atau data pengguna tidak ditemukan |
| `409` | Conflict | Data duplikat (contoh: email sudah terdaftar) |
| `422` | Unprocessable Entity | Validasi Zod gagal pada input |
| `423` | Locked | Akun terkunci sementara karena 5x percobaan login gagal (FR-SEC-01/02) |
| `500` | Internal Server Error | Kesalahan tidak terduga pada server |

### Contoh: Validasi Error (`422`)

```json
{
  "success": false,
  "statusCode": 422,
  "message": "Validation Error",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    },
    {
      "field": "password",
      "message": "Password minimal 6 karakter"
    }
  ]
}
```

### Contoh: Akun Terkunci / Lockout (`423`)

```json
{
  "success": false,
  "statusCode": 423,
  "message": "Akun Anda terkunci selama 15 menit karena 5 kali percobaan login gagal."
}
```

### Contoh: Token Expired (`401`)

```json
{
  "success": false,
  "statusCode": 401,
  "message": "Access token telah kedaluwarsa"
}
```
