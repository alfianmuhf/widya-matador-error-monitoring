# API Documentation — After-Sales Monitoring System

> Base URL: `http://[ip]:[port]` (contoh: `http://localhost:3000` atau `http://10.10.10.10:3000`)

---

## 📋 Daftar Isi

- [Konvensi Umum](#konvensi-umum)
- [Struktur Endpoint Direct (Tanpa Versi)](#struktur-endpoint-direct-tanpa-versi)
- [Health Check](#health-check)
- [Auth Module](#auth-module)
  - [Register](#post-authregister)
  - [Login](#post-authlogin)
  - [Refresh Token](#post-authrefresh)
  - [Logout](#post-authlogout)
  - [Get Current User](#get-authme)
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
- `http://10.10.10.10:3000/auth/register`

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

Mendaftarkan akun pengguna baru.

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

**Response Error:**

| Status | Kondisi |
| :--- | :--- |
| `409 Conflict` | Email sudah terdaftar |
| `422 Unprocessable Entity` | Validasi input gagal |

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

### `POST /auth/logout`

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
| `403` | Forbidden | Akun dinonaktifkan (`status: "SUSPENDED"`); role tidak memiliki izin |
| `404` | Not Found | Route atau resource tidak ditemukan |
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
