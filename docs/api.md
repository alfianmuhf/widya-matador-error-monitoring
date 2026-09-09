# API Documentation — After-Sales Monitoring System

> Base URL: `http://localhost:3000/v1`  
> Root URL: `http://localhost:3000`

---

## 📋 Daftar Isi

- [Konvensi Umum](#konvensi-umum)
- [Arsitektur Modular Versioning](#arsitektur-modular-versioning)
- [Health Check](#health-check)
- [Auth Module](#auth-module)
  - [Register](#post-v1authregister)
  - [Login](#post-v1authlogin)
  - [Refresh Token](#post-v1authrefresh)
  - [Logout](#post-v1authlogout)
  - [Get Current User](#get-v1authme)
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

## Arsitektur Modular Versioning

Sistem menggunakan struktur routing modular agar setiap service atau kelompok fitur dapat memiliki versinya masing-masing secara independen:

```
apps/error-service/src/routes/
├── index.js          # Route aggregator utama — mendaftarkan router berdasarkan versi (/v1, /v2, dst)
└── v1/
    └── index.js      # Aggregator versi 1 — memetakan service modular (auth, errors, robots, dsb)
```

- **Prefix Versi**: `/v1` menggantikan `/api`.
- **Independensi Versi**: Setiap service (misalnya `auth`, `error-monitoring`, dll.) didaftarkan secara modular di dalam routernya masing-masing. Jika suatu saat sebuah service membutuhkan `v2`, service tersebut dapat dibuatkan router `v2/` tanpa mengganggu service `v1` yang sudah berjalan.

---

## Health Check

### `GET /v1/health`

Memeriksa status health dan informasi versi API v1.

**Auth:** Tidak diperlukan

**Response: `200 OK`**

```json
{
  "status": "ok",
  "service": "error-service",
  "version": "v1",
  "timestamp": "2026-09-09T10:10:21.890Z"
}
```

> **Catatan:** Endpoint health check root `GET /health` dan `GET /` juga tersedia tanpa prefix versi untuk kebutuhan container/orchestrator probe.

---

## Auth Module

### `POST /v1/auth/register`

Mendaftarkan akun pengguna baru.

**Auth:** Tidak diperlukan

**Request Body:**

| Field | Tipe | Wajib | Validasi | Keterangan |
| :--- | :--- | :---: | :--- | :--- |
| `email` | `string` | ✅ | Format email valid | Di-trim dan di-lowercase otomatis |
| `password` | `string` | ✅ | Minimal 6 karakter | — |
| `name` | `string` | ❌ | Minimal 2 karakter | Nama pengguna (opsional) |
| `role` | `string` | ❌ | `"USER"` atau `"ADMIN"` | Default: `"USER"` |

**Contoh Request:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "role": "USER"
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
      "role": "USER",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2026-09-09T09:56:47.608Z"
    }
  }
}
```

**Response Error:**

| Status | Kondisi |
| :--- | :--- |
| `409 Conflict` | Email sudah terdaftar |
| `422 Unprocessable Entity` | Validasi input gagal |

---

### `POST /v1/auth/login`

Login pengguna menggunakan email dan password. Mengembalikan Access Token di body dan men-set Refresh Token di HttpOnly cookie.

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
      "role": "USER"
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
| `401 Unauthorized` | Email atau password salah |
| `403 Forbidden` | Akun telah dinonaktifkan |
| `422 Unprocessable Entity` | Validasi input gagal |

---

### `POST /v1/auth/refresh`

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
      "role": "USER"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Response Header (Set-Cookie):**

```
Set-Cookie: refreshToken=<token_baru>; Max-Age=86400; Path=/; HttpOnly; SameSite=Lax
```

**Response Error:**

| Status | Kondisi |
| :--- | :--- |
| `401 Unauthorized` | Refresh token tidak ditemukan, kedaluwarsa, tidak valid, atau sudah di-revoke |

> **⚠️ Keamanan — Token Reuse Detection:**  
> Jika refresh token yang sudah di-revoke (bekas rotasi sebelumnya) digunakan kembali, sistem menganggap terjadi pencurian token. Sebagai perlindungan, **seluruh sesi aktif user tersebut otomatis dicabut** dan user harus login ulang di semua perangkat.

---

### `POST /v1/auth/logout`

Mencabut (revoke) refresh token di database dan menghapus cookie dari browser.

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
  "message": "Logout berhasil"
}
```

**Response Header (Set-Cookie — clear cookie):**

```
Set-Cookie: refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax
```

---

### `GET /v1/auth/me`

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
      "role": "USER",
      "isActive": true,
      "isVerified": false,
      "createdAt": "2026-09-09T09:56:47.608Z",
      "updatedAt": "2026-09-09T09:56:47.608Z"
    }
  }
}
```

**Response Error:**

| Status | Kondisi |
| :--- | :--- |
| `401 Unauthorized` | Token tidak ada, kedaluwarsa, atau tidak valid |
| `404 Not Found` | Data pengguna tidak ditemukan di database |

---

## Error Response

### Kode Status yang Digunakan

| Status | Nama | Kapan Dipakai |
| :--- | :--- | :--- |
| `400` | Bad Request | JSON body tidak valid (syntax error) |
| `401` | Unauthorized | Token tidak ada, expired, atau invalid; password salah |
| `403` | Forbidden | Akun dinonaktifkan; role tidak memiliki izin |
| `404` | Not Found | Route atau resource tidak ditemukan |
| `409` | Conflict | Data duplikat (contoh: email sudah terdaftar) |
| `422` | Unprocessable Entity | Validasi Zod gagal pada input |
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

### Contoh: Route Tidak Ditemukan (`404`)

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Route GET /v1/unknown tidak ditemukan"
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
