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
├── .env.backend.example    # Template variabel environment Backend (copy ke apps/error-service/.env)
├── .env.frontend.example   # Template variabel environment Frontend (copy ke apps/interfaces/.env)
├── .gitignore              # Konfigurasi file yang diabaikan oleh Git
└── README.md               # Dokumentasi utama proyek
```

---

## 🛠️ Arsitektur Sistem & Library yang Digunakan

### 1. Frontend (`apps/interfaces`)
Aplikasi frontend dibangun menggunakan ekosistem modern React dan Vite untuk performa tinggi, tampilan premium, dan pengalaman pengguna yang responsif.

| Library / Tool | Versi | Kegunaan |
| :--- | :--- | :--- |
| **[React](https://react.dev/)** | `^19.2.8` | Library utama untuk membangun antarmuka pengguna berbasis komponen deklaratif. |
| **[React DOM](https://react.dev/)** | `^19.2.8` | Paket render React khusus untuk lingkungan Document Object Model (Web Browser). |
| **[React Router DOM](https://reactrouter.com/)** | `^7.18.3` | Routing client-side deklaratif, navigasi halaman, dan manajemen state URL. |
| **[Axios](https://axios-http.com/)** | `^1.20.0` | HTTP client berbasis Promise dengan interceptor autentikasi dan auto-refresh token. |
| **[Zod](https://zod.dev/)** | `^4.5.4` | Validasi skema data runtime di sisi klien. |
| **[Vite](https://vite.dev/)** | `^8.2.2` | Build tool dan development server generasi baru yang sangat cepat dengan Hot Module Replacement (HMR). |
| **[ESLint](https://eslint.org/)** | `^10.9.0` | Linter statis untuk mendeteksi kesalahan sintaks dan menegakkan konsistensi gaya kode. |
| **[Apache ECharts](https://echarts.apache.org/)** | `^6.1.0` | Pustaka visualisasi grafik data analitik interaktif performa tinggi dari Apache Software Foundation. |
| **[echarts-for-react](https://github.com/hustcc/echarts-for-react)** | `^3.0.6` | Komponen pembungkus React deklaratif untuk integrasi mulus dengan Apache ECharts. |
| **Server-Sent Events (SSE)** | Native API | Streaming data tiket dan audit log secara real-time via `EventSource` bawaan browser tanpa library pihak ketiga. |

### 2. Backend (`apps/error-service`)
Layanan backend dibangun dengan Node.js dan Express untuk menangani pencatatan error, autentikasi, manajemen database, serta streaming event real-time.

| Library / Tool | Versi | Kegunaan |
| :--- | :--- | :--- |
| **[Express.js](https://expressjs.com/)** | `^5.2.1` | Framework web minimalis dan fleksibel untuk routing dan pembuatan REST API. |
| **[Prisma ORM](https://www.prisma.io/)** | `@prisma/client ^7.x`, `prisma ^7.x` | ORM (Object-Relational Mapping) modern untuk interaksi database (PostgreSQL) yang *type-safe* dan mudah dimigrasi. |
| **[@prisma/adapter-pg](https://www.npmjs.com/package/@prisma/adapter-pg) & [pg](https://node-postgres.com/)** | `^7.10.0`, `^8.23.0` | Driver adapter PostgreSQL resmi untuk Prisma Client v7+. |
| **[Zod](https://zod.dev/)** | `^4.5.4` | Library validasi skema data runtime dan TypeScript/JavaScript-first untuk request body dan parameter. |
| **[jsonwebtoken (JWT)](https://github.com/auth0/node-jsonwebtoken)** | `^9.0.3` | Implementasi token JWT untuk mekanisme autentikasi dan otorisasi pengguna (access token & refresh token). |
| **[bcrypt](https://github.com/kelektiv/node.bcrypt.js)** | `^6.0.0` | Algoritma hashing password yang aman untuk melindungi kredensial pengguna di database. |
| **[exceljs](https://github.com/exceljs/exceljs)** | `^4.4.0` | Generator file spreadsheet Microsoft Excel (`.xlsx`) profesional dengan format header, border, dan styling status badge. |
| **[pdfkit](https://github.com/foliojs/pdfkit)** | `^0.20.2` | Generator dokumen cetak PDF resmi untuk rekapitulasi data tiket. |
| **[CORS](https://github.com/expressjs/cors)** | `^2.8.6` | Middleware Express untuk mengizinkan permintaan lintas domain (*Cross-Origin Resource Sharing*) dari frontend. |
| **[cookie-parser](https://github.com/expressjs/cookie-parser)** | `^1.4.7` | Middleware untuk mem-parsing cookie dari HTTP request header (diperlukan untuk membaca refresh token di HttpOnly cookie). |
| **[http-errors](https://github.com/jshttp/http-errors)** | `^2.0.1` | Utilitas pembuatan objek error HTTP standar dengan kode status yang sesuai. |
| **[dotenv](https://github.com/motdotla/dotenv)** | `^17.4.2` | Memuat variabel konfigurasi lingkungan dari file `.env` ke `process.env`. |
| **[amqplib](https://www.npmjs.com/package/amqplib)** | `^2.2.0` | Klien RabbitMQ untuk publish/subscribe event ke exchange `erad.events` dan queue `erad.telegram.notify`. |
| **[nodemon](https://nodemon.io/)** *(Dev)* | `^3.1.14` | Tool otomatis yang merestart server Node.js setiap kali ada perubahan file pada masa pengembangan. |

---

## ✨ Fitur Utama Sistem

1. **Dashboard Ringkasan & Analitik Eksekutif (`/`)**:
   - **6 Kartu KPI Utama**: Total tiket, Open (*perlu tindakan*), Escalated (*dalam pemantauan*), Selesai/Completion Rate (*solved/closed*), MTTR (*Mean Time to Resolution* dalam hari), dan Unit Robot Terdampak.
   - **Tren Deret Waktu**: Visualisasi area/line chart Apache ECharts yang mulus (*smooth bezier curve*) per bulan dengan gradien teal dan hover tooltip interaktif.
   - **Distribusi Status Tiket**: Visualisasi donut chart Apache ECharts dengan proporsi persentase dan legenda warna status.
   - **Peringkat Masalah**: 5 failure code teratas dan 5 unit robot paling bermasalah.
   - **Filter Multi-Dimensi**: Filter rentang waktu (`30 hari`, `90 hari`, `6 bulan`, `Semua`), komponen, klien, lokasi, dan status dengan tombol Reset filter instan.
   - **Real-time Live Sync**: Terhubung ke Server-Sent Events (SSE) sehingga kartu dan grafik otomatis ter-refresh saat ada tiket baru atau perubahan status.

2. **Monitoring Analitik Error (`/analitik-error`)**:
   - **4 Visualisasi Data Berbasis Apache ECharts**:
     - **Tiket per component**: Horizontal bar chart warna teal (`#0e8587`) dengan label jumlah tiket dan kemampuan interaktif klik bar untuk memfilter komponen.
     - **Pareto failure code**: Diagram Pareto dual-axis kombinasi bar frekuensi error + kurva garis persentase kumulatif (`#d97706`) dari 0% hingga 100%.
     - **Sebaran per client (top 8)**: Horizontal bar chart warna dark navy (`#182a38`) untuk identifikasi klien dengan frekuensi error terbanyak.
     - **Peta panas unit × component**: Heatmap matriks interaktif unit robot (sumbu Y) vs nama komponen (sumbu X atas) dengan pewarnaan sel bertingkat (0 = netral, 1 = amber `#dfb36c`, 2+ = deep amber `#c27803`) beserta label tebal.
   - **Filter Multi-Dimensi Terpisah**: Box filter waktu (`30 hari`, `90 hari`, `6 bulan`, `Semua`) dipisah rapi dengan box dropdown filter (`Komponen`, `Klien`, `Lokasi`, `Status`) dan tombol Reset filter instan.
   - **Ekspor Dokumen**: Tombol "Export laporan" terintegrasi dengan modal pilihan rentang tanggal dan format file (Excel / PDF).
   - **Sinkronisasi Real-time**: Terhubung ke Server-Sent Events (SSE) `/tickets/stream` sehingga grafik diperbarui secara otomatis saat ada tiket baru atau perubahan status.

3. **Manajemen Tiket After-Sales (`/daftar-tiket`)**:
   - **Pencarian & Penyaringan Lengkap**: Pencarian teks bebas, pagination, serta filter waktu dan dropdown yang terpisah rapi.
   - **Siklus Hidup Tiket**: Pelacakan status dari `Open` -> `Escalated` -> `Solved` -> `Closed`.
   - **Detail Drawer & Timeline**: Informasi aset, deskripsi kerusakan, foto lampiran, akar masalah (*root cause*), tindakan perbaikan (*action taken*), dan riwayat interaksi teknisi.
   - **Sidebar Live Badge Notification**: Pill badge merah pada menu sidebar yang menghitung tiket berstatus `Open` secara real-time via SSE dan otomatis menghilang saat semua tiket ditangani.

4. **Ekspor Laporan Multi-Format**:
   - Ekspor data tiket hasil filter ke format spreadsheet **Microsoft Excel (`.xlsx`)**.
   - Ekspor data tiket ke dokumen cetak resmi **Adobe PDF (`.pdf`)** lengkap dengan ringkasan KPI dan tabel terformat.

5. **Pengelolaan Master Data (`/master-data`)**:
   - Tab navigasi untuk mengelola **Klien**, **Lokasi Site**, **Komponen Robot**, **Kode Kerusakan (Failure Code)**, dan **Unit Robot (Asset)**.
   - Dilengkapi validasi integritas relasi referensial database (mencegah penghapusan master data yang masih memiliki relasi aktif).

6. **Pengguna & Whitelist Telegram (`/pengguna-whitelist`)**:
   - **Dashboard User**: Registrasi, manajemen role (`ADMIN`, `COORDINATOR`, `VIEWER`), status keaktifan, dan proteksi lockout otomatis setelah 5 kali gagal login.
   - **Telegram Whitelist**: Pengelolaan user Telegram yang diizinkan melaporkan error robot melalui bot Telegram.

7. **Audit Log & Kepatuhan Keamanan (`/audit-logs`)**:
   - Pencatatan seluruh jejak aktivitas pengguna (login, logout, mutasi tiket, perubahan master data) dengan metadata IP address, user agent, dan timestamp.
   - Live stream SSE untuk audit log.

8. **Notifikasi Telegram via n8n**:
   - Undangan user (`user.invited`), klaim tiket grup (`ticket.claimed`), dan penambahan anggota tim (`ticket.member_added`) dikirim ke workflow n8n yang terintegrasi dengan Bot API Telegram. Undangan dikirim sebagai DM ke username yang ditentukan.

9. **Reset password via OTP 6 digit**:
   - Reset password via OTP 6 digit yang dikirim ke Telegram (tanpa tabel baru, in-memory, TTL 5 menit, single-use).

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

## Alur Notifikasi Telegram (Webhook)

Error service mempublish event JSON ke RabbitMQ (exchange `erad.events`, routing key `user.invited` / `ticket.claimed` / `ticket.member_added` / `otp.password_reset`) → queue `erad.telegram.notify` → workflow n8n → Bot API Telegram. Tanpa `RABBITMQ_URL` sistem tetap jalan tanpa notifikasi; detail kontrak event + panduan import workflow ada di `docs/webhook-telegram/`, konfigurasi infra di `infra/` (docker compose RabbitMQ), referensi API HTTP di `docs/api.md`.

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

Tersedia dua template terpisah di root folder: [`.env.backend.example`](.env.backend.example) untuk Backend (Express) dan [`.env.frontend.example`](.env.frontend.example) untuk Frontend (React/Vite).

1. Salin template sesuai aplikasinya:
   ```bash
   # Backend → apps/error-service/.env
   cp .env.backend.example apps/error-service/.env

   # Frontend → apps/interfaces/.env
   cp .env.frontend.example apps/interfaces/.env
   ```
   > Windows PowerShell: `Copy-Item .env.backend.example apps\error-service\.env` (dst).

2. Isi nilai pada tiap file:
   - **Backend (`apps/error-service/.env`)**:
     - `PORT`: Port server backend (default: `3000`).
     - `DATABASE_URL`: Connection string PostgreSQL Anda (contoh: `postgresql://postgres:password@localhost:5432/widya_db?schema=public`).
     - `JWT_SECRET` & `JWT_REFRESH_SECRET`: String rahasia untuk enkripsi token JWT.
     - `FRONTEND_URL`: URL aplikasi frontend (default: `http://localhost:5173`).
     - `RABBITMQ_URL` & `RABBITMQ_EXCHANGE`: Event bus notifikasi Telegram (contoh: `amqp://localhost:5672` / `erad.events`). Kosongkan untuk mode dev tanpa notifikasi (publish dilewati + warning).
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

Seluruh endpoint backend dapat diakses secara langsung (*unversioned*) pada root port server. Dokumentasi detail skema request, response, dan validasi dapat dilihat pada dokumen [docs/api.md](docs/api.md).

### 1. Health Check
| Method | Endpoint | Auth | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Memeriksa status kesehatan server dan konektivitas |

### 2. Auth Module
| Method | Endpoint | Auth | Deskripsi |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Registrasi akun pengguna mandiri (*self-service*) |
| `POST` | `/auth/login` | Public | Login pengguna, mengembalikan Access Token & HttpOnly Refresh Token |
| `POST` | `/auth/refresh` | Cookie | Memperbarui access token dan melakukan rotasi refresh token |
| `POST` | `/auth/logout` | Cookie | Mencabut refresh token di database dan menghapus cookie |
| `GET` | `/auth/me` | Bearer Token | Mengambil data profil pengguna yang sedang login |
| `POST` / `PATCH` | `/auth/change-password` | Bearer Token | Mengubah password akun pengguna yang sedang login |
| `POST` | `/auth/forgot-password` | Public | Minta OTP reset password ke Telegram (respons generik) |
| `POST` | `/auth/reset-password` | Public | Reset password via OTP 6 digit |

### 3. User Management Module
| Method | Endpoint | Auth | Role | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/users` | Bearer Token | `ADMIN` | Registrasi pengguna baru oleh admin dengan initial password; field opsional `telegramId`/`username` untuk tujuan DM notifikasi invite |
| `GET` | `/users` | Bearer Token | `ADMIN` | Mengambil daftar seluruh pengguna dashboard |
| `GET` | `/users/:id` | Bearer Token | `ADMIN`, `COORDINATOR` | Mengambil rincian detail akun pengguna |
| `PATCH` | `/users/:id` | Bearer Token | `ADMIN` | Mengubah profil, status aktif/suspend, atau role pengguna |
| `DELETE` | `/users/:id` | Bearer Token | `ADMIN` | Menghapus data akun pengguna secara permanen |

### 4. Telegram Whitelist Module
| Method | Endpoint | Auth | Role | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/telegram-users` | Bearer Token | `ADMIN` | Mendaftarkan pengguna Telegram ke whitelist pelapor error |
| `GET` | `/telegram-users` | Bearer Token | `ADMIN` | Mengambil daftar seluruh whitelist user Telegram |
| `GET` | `/telegram-users/:id` | Bearer Token | `ADMIN` | Mengambil detail pengguna Telegram di whitelist |
| `PATCH` | `/telegram-users/:id` | Bearer Token | `ADMIN` | Memperbarui data atau status keaktifan user Telegram |
| `DELETE` | `/telegram-users/:id` | Bearer Token | `ADMIN` | Menghapus pengguna Telegram dari whitelist |

### 5. Master Data Modules
| Method | Endpoint | Auth | Role | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `GET` / `POST` | `/clients` | Bearer Token | Read: All, Write: `ADMIN`, `COORDINATOR` | Daftar & tambah data client |
| `GET` / `PATCH` / `DELETE` | `/clients/:id` | Bearer Token | Read: All, Write: `ADMIN`, `COORDINATOR` | Detail, edit, & hapus data client |
| `GET` / `POST` | `/locations` | Bearer Token | Read: All, Write: `ADMIN`, `COORDINATOR` | Daftar & tambah data lokasi site/gudang |
| `GET` / `PATCH` / `DELETE` | `/locations/:id` | Bearer Token | Read: All, Write: `ADMIN`, `COORDINATOR` | Detail, edit, & hapus lokasi site |
| `GET` / `POST` | `/components` | Bearer Token | Read: All, Write: `ADMIN`, `COORDINATOR` | Daftar & tambah kategori komponen robot |
| `GET` / `PATCH` / `DELETE` | `/components/:id` | Bearer Token | Read: All, Write: `ADMIN`, `COORDINATOR` | Detail, edit, & hapus komponen robot |
| `GET` / `POST` | `/failure-codes` | Bearer Token | Read: All, Write: `ADMIN`, `COORDINATOR` | Daftar & tambah kode kerusakan (*failure code*) |
| `GET` / `PATCH` / `DELETE` | `/failure-codes/:id` | Bearer Token | Read: All, Write: `ADMIN`, `COORDINATOR` | Detail, edit, & hapus kode kerusakan |
| `GET` / `POST` | `/assets` | Bearer Token | Read: All, Write: `ADMIN`, `COORDINATOR` | Daftar & tambah unit robot operasional (*asset*) |
| `GET` / `PATCH` / `DELETE` | `/assets/:id` | Bearer Token | Read: All, Write: `ADMIN`, `COORDINATOR` | Detail, edit, & hapus unit robot |

### 6. Ticket Management Module
| Method | Endpoint | Auth | Role | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/tickets/stream` | Bearer Token / Query `token` | All | Real-time Server-Sent Events (SSE) streaming tiket & open count |
| `GET` | `/tickets` | Bearer Token | All | Daftar tiket terfilter & terpaginasi |
| `GET` | `/tickets/:id` | Bearer Token | All | Detail tiket lengkap, riwayat status, & komentar penanganan |
| `PATCH` | `/tickets/:id` | Bearer Token | All | Update status tiket (Open, Escalated, Solved, Closed) & catatan |
| `POST` | `/tickets/:id/comments` | Bearer Token | All | Menambahkan catatan perkembangan penanganan ke timeline tiket |
| `POST` | `/tickets` | Bearer Token | `ADMIN`, `COORDINATOR` | Membuat tiket penanganan error baru secara manual |

### 7. Export Module
| Method | Endpoint | Auth | Role | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/exports/excel` | Bearer Token / Query `token` | All | Unduh file laporan tiket terfilter dalam format Excel (`.xlsx`) |
| `GET` | `/exports/pdf` | Bearer Token / Query `token` | All | Unduh dokumen laporan resmi tiket terfilter dalam format PDF (`.pdf`) |
| `GET` | `/tickets/export/excel` | Bearer Token / Query `token` | All | Alias unduh laporan Excel |
| `GET` | `/tickets/export/pdf` | Bearer Token / Query `token` | All | Alias unduh laporan PDF |

### 8. Audit Log Module
| Method | Endpoint | Auth | Role | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/audit-logs/stream` | Bearer Token / Query `token` | `ADMIN` | Real-time Server-Sent Events (SSE) stream audit log |
| `GET` | `/audit-logs` | Bearer Token | `ADMIN` | Mengambil riwayat log aktivitas sistem dengan paginasi & filter |
| `GET` | `/audit-logs/:id` | Bearer Token | `ADMIN` | Detail log audit spesifik beserta perbandingan data sebelum/sesudah |

### 9. Summary & Analytics Dashboard Module
| Method | Endpoint | Auth | Role | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/summary` | Bearer Token | All | Mengambil ringkasan agregasi metrik KPI, tren grafik, & ranking kerusakan |
| `GET` | `/ringkasan` | Bearer Token | All | Alias endpoint `/summary` |
| `GET` | `/error-analytics` | Bearer Token | All | Mengambil visualisasi data analitik error (tiket per komponen, pareto code, sebaran klien, heatmap unit vs komponen) berbasis format Apache ECharts |
| `GET` | `/analytics` | Bearer Token | All | Alias endpoint `/error-analytics` |

---

## 📌 Catatan Kontribusi & Git
- Jangan pernah meng-commit file `.env` atau folder `node_modules/` ke repository.
- Selalu gunakan branch terpisah sebelum melakukan merge ke `main`.
- Pastikan menjalankan `npm run build` pada folder `apps/interfaces` dan memeriksa server backend sebelum melakukan push.
