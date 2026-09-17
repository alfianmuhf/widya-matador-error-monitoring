# Widya Matador - Error Monitoring & After-Sales Platform

Platform monitoring error dan after-sales service yang dirancang dengan arsitektur modular (*monorepo style*), memisahkan antara layanan backend (*error service*) dan antarmuka web (*frontend interfaces*).

---

## 📁 Struktur Direktori

```text
after-sales-platform/
├── apps/
│   ├── error-service/      # Layanan backend REST API & error monitoring
│   └── interfaces/         # Antarmuka web pengguna (Frontend React)
├── docs/                   # Dokumen spesifikasi dan perancangan sistem
├── infra/                  # Konfigurasi infrastruktur, container, & deployment
├── .env.example            # Template variabel environment terpadu (Backend & Frontend)
├── .gitignore              # Konfigurasi file yang diabaikan oleh Git
└── README.md               # Dokumentasi utama proyek
```

---

## 🛠️ Arsitektur Sistem & Library yang Digunakan

### 1. Frontend (`apps/interfaces`)
Aplikasi frontend dibangun menggunakan ekosistem modern React dan Vite untuk performa tinggi dan pengalaman pengguna yang interaktif.

| Library / Tool | Versi | Kegunaan |
| :--- | :--- | :--- |
| **[React](https://react.dev/)** | `^19.2.8` | Library utama untuk membangun antarmuka pengguna berbasis komponen deklaratif. |
| **[React DOM](https://react.dev/)** | `^19.2.8` | Paket render React khusus untuk lingkungan Document Object Model (Web Browser). |
| **[Vite](https://vite.dev/)** | `^8.2.2` | Build tool dan development server generasi baru yang sangat cepat dengan modul Hot Module Replacement (HMR). |
| **[ESLint](https://eslint.org/)** | `^10.9.0` | Linter statis untuk mendeteksi kesalahan sintaks dan menegakkan konsistensi gaya kode. |

### 2. Backend (`apps/error-service`)
Layanan backend dibangun dengan Node.js dan Express untuk menangani pencatatan error, autentikasi, serta manajemen database.

| Library / Tool | Versi | Kegunaan |
| :--- | :--- | :--- |
| **[Express.js](https://expressjs.com/)** | `^5.2.1` | Framework web minimalis dan fleksibel untuk routing dan pembuatan REST API. |
| **[Prisma ORM](https://www.prisma.io/)** | `@prisma/client ^7.x`, `prisma ^7.x` | ORM (Object-Relational Mapping) modern untuk interaksi database (PostgreSQL) yang *type-safe* dan mudah dimigrasi. |
| **[@prisma/adapter-pg](https://www.npmjs.com/package/@prisma/adapter-pg) & [pg](https://node-postgres.com/)** | `^7.10.0`, `^8.23.0` | Driver adapter PostgreSQL resmi untuk Prisma Client v7+. |
| **[Zod](https://zod.dev/)** | `^4.5.4` | Library validasi skema data runtime dan TypeScript/JavaScript-first untuk request body dan parameter. |
| **[jsonwebtoken (JWT)](https://github.com/auth0/node-jsonwebtoken)** | `^9.0.3` | Implementasi token JWT untuk mekanisme autentikasi dan otorisasi pengguna (access token & refresh token). |
| **[bcrypt](https://github.com/kelektiv/node.bcrypt.js)** | `^6.0.0` | Algoritma hashing password yang aman untuk melindungi kredensial pengguna di database. |
| **[CORS](https://github.com/expressjs/cors)** | `^2.8.6` | Middleware Express untuk mengizinkan permintaan lintas domain (*Cross-Origin Resource Sharing*) dari frontend. |
| **[cookie-parser](https://github.com/expressjs/cookie-parser)** | `^1.4.7` | Middleware untuk mem-parsing cookie dari HTTP request header (diperlukan untuk membaca refresh token di HttpOnly cookie). |
| **[http-errors](https://github.com/jshttp/http-errors)** | `^2.0.1` | Utilitas pembuatan objek error HTTP standar dengan kode status yang sesuai. |
| **[dotenv](https://github.com/motdotla/dotenv)** | `^17.4.2` | Memuat variabel konfigurasi lingkungan dari file `.env` ke `process.env`. |
| **[nodemon](https://nodemon.io/)** *(Dev)* | `^3.1.14` | Tool otomatis yang merestart server Node.js setiap kali ada perubahan file pada masa pengembangan. |

---

## 🚀 Panduan Memulai (Setup untuk Developer)

Ikuti langkah-langkah di bawah ini jika Anda baru melakukan `git clone` terhadap repository ini.

### 1. Prasyarat Sistem
Pastikan perangkat Anda telah terpasang:
- **Node.js** (Rekomendasi: versi LTS `>= 20.x`)
- **npm** (atau package manager lain seperti `pnpm` / `yarn`)
- **Git**
- **PostgreSQL Database** (Lokal atau Cloud seperti Supabase/Neon)

---

### 2. Clone Repository
Buka terminal dan clone repository menggunakan salah satu protokol:

**Menggunakan HTTPS:**
```bash
git clone https://github.com/alfianmuhf/widya-matador-error-monitoring.git
cd widya-matador-error-monitoring
```

**Menggunakan SSH:**
```bash
git clone git@github.com:alfianmuhf/widya-matador-error-monitoring.git
cd widya-matador-error-monitoring
```

---

### 3. Install Dependensi (Libraries)

Karena proyek ini menggunakan struktur multi-aplikasi, Anda perlu menginstal dependensi pada masing-masing folder aplikasi:

#### A. Install Dependensi Backend (`error-service`)
```bash
cd apps/error-service
npm install
```

#### B. Install Dependensi Frontend (`interfaces`)
Buka terminal baru atau kembali ke root lalu masuk ke folder frontend:
```bash
cd apps/interfaces
npm install
```

---

### 4. Konfigurasi Environment Variables (`.env`)

Template konfigurasi lingkungan tersedia di root folder: [`.env.example`](.env.example) yang mencakup konfigurasi untuk **Backend (Express)** dan **Frontend (React/Vite)** sekaligus.

1. Salin template `.env.example` di root menjadi `.env`:
   ```bash
   # Di Windows PowerShell:
   Copy-Item .env.example .env

   # Di Linux / macOS / Git Bash:
   cp .env.example .env
   ```
2. Salin atau arahkan file `.env` tersebut ke aplikasi terkait jika diperlukan:
   - **Backend (`apps/error-service/.env`)**:
     - `PORT`: Port server backend (default: `3000`).
     - `DATABASE_URL`: Connection string PostgreSQL Anda (contoh: `postgresql://postgres:password@localhost:5432/widya_db?schema=public`).
     - `JWT_SECRET` & `JWT_REFRESH_SECRET`: String rahasia untuk enkripsi token JWT.
     - `FRONTEND_URL`: URL aplikasi frontend (default: `http://localhost:5173`).
   - **Frontend (`apps/interfaces/.env`)**:
     - `VITE_API_BASE_URL`: URL endpoint REST API backend (default: `http://localhost:3000`).

---

### 5. Setup Database dengan Prisma

Setelah mengisi `DATABASE_URL` di file `.env`, jalankan perintah Prisma di dalam `apps/error-service`:

```bash
# Generate Prisma Client
npx prisma generate

# Menjalankan migrasi database (jika skema sudah ada)
npx prisma migrate dev
```

---

### 6. Menjalankan Aplikasi

#### Menjalankan Backend (`error-service`):
```bash
cd apps/error-service
# Mode pengembangan (dengan live reload via nodemon):
npm run dev

# Mode produksi:
npm start
```
Layanan akan aktif di: `http://localhost:3000`

#### Menjalankan Frontend (`interfaces`):
```bash
cd apps/interfaces
npm run dev
```
Antarmuka web akan aktif di: `http://localhost:5173`

---

## 🔐 API Endpoints

### Auth Module
| Method | Endpoint | Auth | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Health check status server |
| `POST` | `/auth/register` | Public | Registrasi akun pengguna mandiri |
| `POST` | `/auth/login` | Public | Login pengguna, menghasilkan Access Token (body) & Refresh Token (`HttpOnly` cookie) |
| `POST` | `/auth/refresh` | Cookie | Memperbarui access token dan melakukan rotasi refresh token |
| `POST` | `/auth/logout` | Cookie | Mencabut refresh token di database dan membersihkan cookie |
| `GET` | `/auth/me` | Bearer Token | Mengambil data profil pengguna yang sedang login |
| `POST` / `PATCH` | `/auth/change-password` | Bearer Token | Mengubah password akun pengguna yang sedang login |

### User Management Module (Admin & Coordinator)
| Method | Endpoint | Auth | Role | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/users` | Bearer Token | `ADMIN` | Registrasi akun baru oleh admin dengan auto-generated initial password |
| `GET` | `/users` | Bearer Token / Cookie | `ADMIN` | Mengambil daftar seluruh pengguna (JSON atau SSE jika requested) |
| `GET` | `/users/stream` | Bearer Token / `?token=` | `ADMIN` | Stream real-time data pengguna via Server-Sent Events (SSE) |
| `GET` | `/users/:id` | Bearer Token | `ADMIN`, `COORDINATOR` | Mengambil detail lengkap pengguna berdasarkan ID |
| `PATCH` / `PUT` | `/users/:id` | Bearer Token | `ADMIN` | Mengubah data pengguna (email, nama, password, role, status) |
| `DELETE` | `/users/:id` | Bearer Token | `ADMIN` | Menghapus data pengguna secara permanen beserta sesi terkait |

### Telegram Whitelist Module (Admin)
| Method | Endpoint | Auth | Role | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/telegram-users` | Bearer Token | `ADMIN` | Menambahkan pengguna Telegram ke daftar whitelist |
| `GET` | `/telegram-users` | Bearer Token | `ADMIN` | Mengambil daftar seluruh pengguna Telegram di whitelist |
| `GET` | `/telegram-users/:id` | Bearer Token | `ADMIN` | Mengambil detail pengguna Telegram di whitelist |
| `PATCH` / `PUT` | `/telegram-users/:id` | Bearer Token | `ADMIN` | Mengubah data atau status keaktifan user Telegram (`isActive`) |
| `DELETE` | `/telegram-users/:id` | Bearer Token | `ADMIN` | Menghapus pengguna Telegram dari whitelist |

---

## 📌 Catatan Kontribusi & Git
- Jangan pernah meng-commit file `.env` atau folder `node_modules/` ke repository.
- Selalu gunakan branch terpisah sebelum melakukan merge ke `main`.
