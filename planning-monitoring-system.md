# Planning: ERAD — Error Report Automation Dashboard

## 1. Overview Project

**Nama Produk:** Error Report Automation Dashboard (ERAD) — Load Scanner Aftersales
**Dokumen Acuan:** PRD ERAD v1.1.0 (8 September 2026)
**Tujuan:** Sistem pelaporan tiket error berbasis bot Telegram + n8n dan dashboard analitik web untuk Tim Aftersales Load Scanner. Teknisi melaporkan error via percakapan Telegram, data tersimpan terstruktur di PostgreSQL, dan divisualisasikan sebagai statistik serta executive summary di dashboard web.

### Tech Stack

| Layer          | Teknologi                                     |
|----------------|-----------------------------------------------|
| Backend        | Express.js v5 (JavaScript, ESM)               |
| Auth           | JWT (access token) + Refresh Token (rotasi)   |
| Validasi       | Zod v4                                        |
| ORM            | Prisma v7 + @prisma/adapter-pg                |
| Database       | PostgreSQL (timestamptz, UTC → WIB display)   |
| Hashing        | Bcrypt                                        |
| Error Handling | http-errors                                   |
| Frontend       | React 19 + Vite 8 + React Router 7            |
| HTTP Client    | Axios (dengan interceptor auto-refresh)       |
| Infra          | Docker, Docker Compose, Nginx (planned)       |
| Bot Engine     | n8n (workflow automation, terhubung DB)        |

---

## 2. Analisis Kondisi Saat Ini (As-Is)

### 2.1 Backend (`apps/error-service`)

**Arsitektur:** Feature-based modular dengan layering per module:
```
Route → Middleware (validate/auth) → Controller → Service → Repository → Prisma → DB
```

**Modul yang sudah diimplementasi:**

| Modul         | Status   | File (5 per modul)                    | Keterangan                              |
|---------------|----------|---------------------------------------|-----------------------------------------|
| `auth`        | ✅ Selesai | controller, service, route, schema, repository | Login, register, refresh, logout, me, change-password |
| `user`        | ✅ Selesai | controller, service, route, schema, repository | CRUD user (admin only), role/status management |
| `telegram`    | ✅ Selesai | controller, service, route, schema, repository | Whitelist telegram user CRUD            |
| `client`      | ✅ Selesai | controller, service, route, schema, repository | CRUD master data client                 |
| `location`    | ✅ Selesai | controller, service, route, schema, repository | CRUD master data lokasi                 |
| `component`   | ✅ Selesai | controller, service, route, schema, repository | CRUD master data component              |
| `failure-code`| ✅ Selesai | controller, service, route, schema, repository | CRUD failure code (linked to component) |
| `asset`       | ✅ Selesai | controller, service, route, schema, repository | CRUD asset robot/unit                   |

**Middleware yang sudah ada:**
- `auth.middleware.js` — JWT Bearer verification + role guard
- `validate.middleware.js` — Zod schema validation
- `error.middleware.js` — Global error handler + 404

**Utilitas:**
- `jwt.js` — Token generation/verification
- `hash.js` — Bcrypt password hashing

**Konfigurasi:**
- `env.js` — Environment validation via Zod
- `prisma.js` — Prisma client with pg adapter

### 2.2 Frontend (`apps/interfaces`)

**Pages yang sudah ada:**

| Page                | Status     | Keterangan                                          |
|---------------------|------------|-----------------------------------------------------|
| `Login.jsx`         | ✅ Selesai  | Login form dengan validasi Zod, error handling       |
| `Dashboard.jsx`     | ⚠️ Placeholder | Kartu statis (hardcoded), belum terhubung API       |
| `DaftarTiket.jsx`   | ⚠️ Mock Data | Menggunakan `mockTickets.js`, filter/search lokal, belum terhubung API tiket backend |
| `MasterData.jsx`    | ✅ Terhubung API | Tab: Client, Lokasi, Komponen, Failure Code, Asset — semua CRUD via API |
| `PenggunaWhitelist.jsx` | ✅ Terhubung API | Tab: Pengguna Dashboard, Whitelist Telegram — CRUD via API |

**Komponen:**
- Layout: `DashboardLayout.jsx`, `Header.jsx`, `Sidebar.jsx`
- Tickets: `TicketTable.jsx`, `TicketDetailDrawer.jsx`, `TicketFilterBar.jsx`, `ExportReportModal.jsx`
- Master Data: `ClientTable`, `LocationTable`, `ComponentTable`, `FailureCodeTable`, `AssetTable`, `MasterDataModal`
- Users: `UserTable`, `UserModal`, `TelegramTable`, `TelegramModal`
- Common: `ProtectedRoute.jsx`, `EmptyPage.jsx`, `DeleteConfirmModal.jsx`

**Routing & Auth:**
- `AuthContext.jsx` — Token management, auto-refresh on mount
- `api.js` — Axios interceptor dengan queue-based token refresh
- `ProtectedRoute.jsx` — Route guard dengan role check (Admin, Coordinator, Viewer)

### 2.3 Prisma Schema Lama (Saat Ini di `apps/error-service/prisma/schema.prisma`)

| Model          | Status     | Keterangan                                     |
|----------------|------------|-------------------------------------------------|
| `User`         | ✅ Ada      | Enum `Role` (bukan `UserRole`), `@default(uuid())` bukan `gen_random_uuid()`, `passwordHash` nullable |
| `RefreshToken`  | ✅ Ada     | Cascade delete, ada index userId                |
| `TelegramUser`  | ✅ Ada     | Relation name berbeda (`TelegramUserWhitelistedBy`) |
| `Client`        | ✅ Ada     | Sederhana, tanpa relasi TelegramGroup           |
| `Location`      | ✅ Ada     | Sederhana, tanpa relasi TelegramGroup           |
| `Asset`         | ✅ Ada     | `type` dan `status` sebagai String, bukan Enum, tidak ada relasi ke Ticket |
| `Component`     | ✅ Ada     | `prefix` tanpa unique constraint, tidak ada relasi ke Ticket |
| `FailureCode`   | ✅ Ada     | `@@unique([componentId, code])`, code tidak standalone unique, tidak ada relasi ke Ticket |
| `Ticket`        | ❌ Tidak Ada | **Belum ada** — ini core domain PRD            |
| `TicketHistory`  | ❌ Tidak Ada | **Belum ada**                                  |
| `TicketAttachment` | ❌ Tidak Ada | **Belum ada**                                |
| `TelegramEvent`  | ❌ Tidak Ada | **Belum ada** — idempotency guard             |
| `BotSession`     | ❌ Tidak Ada | **Belum ada** — conversation state management |
| `AuditLog`       | ❌ Tidak Ada | **Belum ada**                                 |
| `ExportJob`      | ❌ Tidak Ada | **Belum ada**                                 |
| `TelegramGroup`  | ❌ Tidak Ada | **Belum ada**                                 |

---

## 3. Schema Migration: Lama → Baru (`schema.prisma_terbaru`)

### 3.1 Perubahan pada Model Existing

#### `User`
| Aspek                  | Schema Lama                       | Schema Baru                                    |
|------------------------|-----------------------------------|------------------------------------------------|
| ID generation          | `@default(uuid())`               | `@default(dbgenerated("gen_random_uuid()"))` + `@db.Uuid` |
| Role enum name         | `Role` (VIEWER, COORDINATOR, ADMIN) | `UserRole` (ADMIN, COORDINATOR, VIEWER)       |
| Password               | `passwordHash String?`            | `passwordHash String` (NOT NULL)               |
| Timestamps             | `@updatedAt`                      | `updatedAt DateTime?` (manual, nullable)       |
| Field types             | String (default)                 | `@db.VarChar(100)`, `@db.Timestamptz`          |
| Relasi baru            | —                                | `exportJobs`, `ticketsReported`, `ticketHistoryChanges`, `auditLogs` |
| Relation name change   | `TelegramUserWhitelistedBy`       | `TelegramWhitelistedBy`                        |

#### `RefreshToken`
| Aspek          | Schema Lama           | Schema Baru                                    |
|----------------|-----------------------|------------------------------------------------|
| ID generation  | `@default(uuid())`    | `@default(dbgenerated("gen_random_uuid()"))` + `@db.Uuid` |
| Index          | `@@index([userId])`   | Tidak ada explicit index                        |

#### `TelegramUser`
| Aspek          | Schema Lama                       | Schema Baru                                    |
|----------------|-----------------------------------|------------------------------------------------|
| ID generation  | `@default(uuid())`               | `@default(dbgenerated("gen_random_uuid()"))` + `@db.Uuid` |
| Timestamps     | `@updatedAt`                     | `updatedAt DateTime?` (manual, nullable)       |
| Relasi baru    | —                                | `botSession`, `ticketsReported`, `ticketHistoryChanges`, `auditLogs` |
| Relation name  | `TelegramUserWhitelistedBy`       | `TelegramWhitelistedBy`                        |

#### `Client`
| Aspek          | Schema Lama          | Schema Baru                                    |
|----------------|----------------------|------------------------------------------------|
| ID generation  | `@default(uuid())`   | `@default(dbgenerated("gen_random_uuid()"))` + `@db.Uuid` |
| Field types    | String (default)     | `@db.VarChar(100)`                             |
| Relasi baru    | —                    | `telegramGroups`                               |

#### `Location`
| Aspek          | Schema Lama          | Schema Baru                                    |
|----------------|----------------------|------------------------------------------------|
| ID generation  | `@default(uuid())`   | `@default(dbgenerated("gen_random_uuid()"))` + `@db.Uuid` |
| Relasi baru    | —                    | `telegramGroups`                               |

#### `Asset`
| Aspek          | Schema Lama           | Schema Baru                                    |
|----------------|-----------------------|------------------------------------------------|
| ID generation  | `@default(uuid())`    | `@default(dbgenerated("gen_random_uuid()"))` + `@db.Uuid` |
| type           | `String`              | `TypeAsset` enum (PORTABLE, STATIC)            |
| status         | `String`              | `AssetStatus` enum (ACTIVE, MAINTENANCE, RETIRED) |
| commissioningDate | `DateTime?`        | `@db.Date`                                     |
| Timestamps     | `createdAt, updatedAt` | **Dihapus** (tidak ada di schema baru)         |
| Relasi baru    | —                     | `tickets` (Ticket[])                           |

#### `Component`
| Aspek          | Schema Lama       | Schema Baru                                    |
|----------------|-------------------|------------------------------------------------|
| ID generation  | `@default(uuid())`| `@default(dbgenerated("gen_random_uuid()"))` + `@db.Uuid` |
| prefix         | Tidak unique      | `@unique`                                      |
| Field types    | String (default)  | `@db.VarChar(10)`, `@db.VarChar(100)`          |
| Relasi baru    | —                 | `tickets` (Ticket[])                           |

#### `FailureCode`
| Aspek          | Schema Lama                      | Schema Baru                                    |
|----------------|----------------------------------|------------------------------------------------|
| ID generation  | `@default(uuid())`              | `@default(dbgenerated("gen_random_uuid()"))` + `@db.Uuid` |
| code           | `@@unique([componentId, code])` | `@unique` (standalone unique)                  |
| Field types    | String (default)                | `@db.VarChar(20)`                              |
| Relasi baru    | —                               | `tickets` (Ticket[])                           |

### 3.2 Model Baru yang Ditambahkan

| Model             | Tujuan PRD                                     | FR Terkait                   |
|-------------------|-------------------------------------------------|------------------------------|
| `Ticket`           | Core domain — tiket error dari bot/dashboard   | FR-TKT-01..06, FR-BOT-12..16 |
| `TicketHistory`    | Audit trail perubahan tiket                    | FR-TKT-04, FR-SEC-04         |
| `TicketAttachment` | Lampiran foto tiket                            | FR-BOT-14                    |
| `TelegramEvent`    | Idempotency guard (cegah tiket ganda)          | FR-BOT-01, US-25             |
| `BotSession`       | State percakapan bot Telegram                  | FR-BOT-04                    |
| `AuditLog`         | Log seluruh perubahan data penting             | FR-SEC-04, US-24             |
| `ExportJob`        | Job asinkron untuk ekspor PDF/Excel            | FR-RPT-01..03                |
| `TelegramGroup`    | Grup Telegram terkait client/lokasi            | FR-BOT-13, FR-RPT-05         |

### 3.3 Enum Baru

| Enum           | Values                                                          |
|----------------|-----------------------------------------------------------------|
| `TypeAsset`    | PORTABLE, STATIC                                                |
| `AssetStatus`  | ACTIVE, MAINTENANCE, RETIRED                                    |
| `TicketStatus` | open, escalated, solved, closed                                 |
| `TicketSource` | telegram, dashboard                                             |
| `BotState`     | IDLE, AWAIT_ASSET, AWAIT_COMPONENT, AWAIT_FAILURE_CODE, AWAIT_DETAIL, AWAIT_UPDATE, COMMITTED |
| `DeleteStatus` | NONE, SOFT, HARD                                                |
| `ExportStatus` | QUEUED, PROCESSING, READY, FAILED                               |

> **Catatan:** PRD menyebut status tiket: open → monitor → solved → closed. Schema baru menggunakan `open, escalated, solved, closed`. **Dikonfirmasi:** `escalated` menggantikan `monitor` dari PRD.

---

## 4. Gap Analysis: PRD vs Implementasi Saat Ini

### 4.1 Backend Gaps (API/Logic yang Belum Ada)

| Kode PRD    | Kebutuhan                                    | Status      | Prioritas |
|-------------|----------------------------------------------|-------------|-----------|
| FR-TKT-01   | CRUD Ticket (create, read, update)           | ❌ Belum    | **M**     |
| FR-TKT-02   | Lifecycle: open → escalated → solved → closed | ❌ Belum   | **M**     |
| FR-TKT-03   | Auto-fill `resolved_at` saat solved, hitung MTTR | ❌ Belum | **M**     |
| FR-TKT-04   | Ticket history (audit trail perubahan)       | ❌ Belum    | **M**     |
| FR-TKT-05   | Transactional create ticket + history        | ❌ Belum    | **M**     |
| FR-TKT-06   | Create ticket dari dashboard (source: dashboard) | ❌ Belum | **C**     |
| FR-BOT-12   | Generate Ticket ID: ERR-YYYYMMDD-NNNN       | ❌ Belum    | **M**     |
| FR-DSH-01   | Stats API: KPI summary (total, MTTR, dll)    | ❌ Belum    | **M**     |
| FR-DSH-02   | Stats by component & failure code (Pareto)   | ❌ Belum    | **M**     |
| FR-DSH-03   | Tren tiket per hari/bulan                    | ❌ Belum    | **M**     |
| FR-DSH-04   | Distribusi status, per client, per lokasi    | ❌ Belum    | **M**     |
| FR-DSH-05   | Top 10 unit bermasalah                       | ❌ Belum    | **S**     |
| FR-DSH-06   | Global filter API (tanggal, bulan, unit, dll)| ❌ Belum    | **M**     |
| FR-DSH-07   | Daftar tiket + search + sort + pagination    | ❌ Belum    | **M**     |
| FR-DSH-08   | Detail tiket + lampiran + history            | ❌ Belum    | **M**     |
| FR-DSH-09   | Update status tiket dari dashboard           | ❌ Belum    | **C**     |
| FR-DSH-10   | Executive summary rule-based                 | ❌ Belum    | **M**     |
| FR-RPT-01   | Ekspor Excel (data + ringkasan)              | ❌ Belum    | **M**     |
| FR-RPT-02   | Ekspor PDF (KPI + grafik + tabel)            | ❌ Belum    | **M**     |
| FR-RPT-03   | Async export job                             | ❌ Belum    | **S**     |
| FR-SEC-04   | Audit log system                             | ❌ Belum    | **M**     |
| FR-MDM-07   | Master data changes → audit log              | ❌ Belum    | **M**     |

### 4.2 Frontend Gaps

| Kode PRD    | Kebutuhan                                    | Status      | Prioritas |
|-------------|----------------------------------------------|-------------|-----------|
| FR-DSH-01   | Dashboard KPI cards (data real, bukan mock)   | ❌ Belum   | **M**     |
| FR-DSH-02   | Grafik component & Pareto failure code        | ❌ Belum   | **M**     |
| FR-DSH-03   | Grafik tren harian/bulanan                    | ❌ Belum   | **M**     |
| FR-DSH-04   | Distribusi status, per client/lokasi          | ❌ Belum   | **M**     |
| FR-DSH-05   | Top 10 unit bermasalah                        | ❌ Belum   | **S**     |
| FR-DSH-06   | Global filter panel                           | ❌ Belum   | **M**     |
| FR-DSH-07   | Daftar tiket terhubung API (bukan mock)       | ❌ Belum   | **M**     |
| FR-DSH-08   | Detail tiket + history + lampiran dari API    | ❌ Belum   | **M**     |
| FR-DSH-10   | Halaman executive summary                     | ❌ Belum   | **M**     |
| FR-DSH-11   | Responsif (tablet & ponsel)                   | ❌ Belum   | **S**     |
| US-24        | Halaman audit log viewer                     | ❌ Belum   | **S**     |

### 4.3 Bot Telegram (n8n) — Seluruhnya Belum

Seluruh modul FR-BOT-01 hingga FR-BOT-17 belum diimplementasi di sisi backend API (webhook handler, session management, ticket creation via bot). Ini dihandle oleh n8n workflow yang terhubung langsung ke PostgreSQL.

---

## 5. Rencana Implementasi (Phased Roadmap)

### Phase 1 — Auth Foundation ✅ SELESAI

1. [x] Setup monorepo + folder structure
2. [x] Setup Prisma schema (User, RefreshToken) + sync database
3. [x] Implement module `auth`: register, login, refresh (token rotation), logout, me, change-password
4. [x] Implement middleware: `validate` (Zod), `auth` (JWT Bearer + role guard), `error` (global)
5. [x] Setup Prisma Client v7 dengan `@prisma/adapter-pg` driver adapter
6. [x] Validasi environment variables saat startup via Zod
7. [x] Token Reuse Detection — proteksi keamanan otomatis
8. [x] Testing endpoint auth

### Phase 2 — User & Telegram Management + Master Data ✅ SELESAI

1. [x] CRUD User (admin only) — create, list, get, update, delete
2. [x] CRUD Telegram User whitelist
3. [x] CRUD Client
4. [x] CRUD Location
5. [x] CRUD Component (with prefix, sortOrder)
6. [x] CRUD Failure Code (linked to component)
7. [x] CRUD Asset (linked to client, location)

### Phase 3 — Frontend Auth + Master Data UI ✅ SELESAI

1. [x] Setup React app di `apps/interfaces` dengan Vite
2. [x] Auth flow: Login page, AuthContext, axios interceptor auto-refresh
3. [x] ProtectedRoute dengan role check
4. [x] DashboardLayout (sidebar + header)
5. [x] Halaman Pengguna & Whitelist Telegram (terhubung API)
6. [x] Halaman Master Data — tabs: Client, Lokasi, Komponen, Failure Code, Asset (terhubung API)
7. [x] Halaman Daftar Tiket (UI selesai, masih mock data)

---

### Phase 4 — Schema Migration + Ticket Core ⬅️ FASE BERIKUTNYA

**Tujuan:** Migrasi Prisma schema ke `schema.prisma_terbaru` dan implementasi fitur inti tiket.

#### 4.1 Database Migration ✅ SELESAI
- [x] Backup database existing
- [x] Buat migration script dari schema lama → schema baru
  - [x] Ubah UUID generation ke `gen_random_uuid()` (natively didukung PostgreSQL)
  - [x] Tambahkan enum baru: `TypeAsset`, `AssetStatus`, `TicketStatus`, `TicketSource`, `BotState`, `DeleteStatus`, `ExportStatus`
  - [x] Rename enum `Role` → `UserRole`
  - [x] Ubah `User.passwordHash` dari nullable ke NOT NULL
  - [x] Ubah `Asset.type` dari String → `TypeAsset` enum
  - [x] Ubah `Asset.status` dari String → `AssetStatus` enum
  - [x] Hapus `Asset.createdAt` dan `Asset.updatedAt`
  - [x] Ubah `Component.prefix` menjadi `@unique`
  - [x] Ubah `FailureCode.code` menjadi standalone `@unique` (hapus composite unique)
  - [x] Tambahkan field types (`@db.VarChar`, `@db.Timestamptz`, `@db.Uuid`, `@db.Date`)
- [x] Buat tabel baru: `tickets`, `ticket_history`, `ticket_attachments`, `telegram_events`, `bot_sessions`, `audit_logs`, `exports_jobs`, `telegram_groups`
- [x] Terapkan DDL migrasi dan validasi seluruh 16 tabel di database
- [x] Update `prisma generate` dan pastikan Prisma Client v7 berfungsi
- [x] Seed Super Admin user (`admin@widya.com` / `admin123`)
- [x] Perbaiki regresi modul `asset` (`orderBy unitCode`) dan `failure-code` (`findByCode`)

#### 4.2 Backend — Module Ticket ✅ SELESAI
- [x] `modules/ticket/ticket.events.js` — Realtime Server-Sent Events (SSE) broadcaster
- [x] `modules/ticket/ticket.repository.js` — Prisma queries untuk Ticket CRUD
- [x] `modules/ticket/ticket.service.js` — Business logic:
  - [x] Generate Ticket ID format: `ERR-YYYYMMDD-NNNN` (sequence harian)
  - [x] Ticket lifecycle validation: open → escalated → solved → closed
  - [x] Auto-fill `resolved_at` saat status → solved, reset saat open/escalated
  - [x] Transactional create & update: ticket + ticket_history dalam satu transaksi
  - [x] Calculate durasi penanganan (MTTR)
  - [x] Formatting field kaya sesuai UI `apps/interfaces` (`id`, `unit`, `unitType`, `client`, `location`, `component`, `failureCode`, `durationText`, `createdDateText`, dll)
- [x] `modules/ticket/ticket.controller.js` — Request/Response handling & SSE handler
- [x] `modules/ticket/ticket.schema.js` — Zod validation schemas
- [x] `modules/ticket/ticket.route.js` — Endpoint routing:
  - [x] `GET /tickets/stream` — SSE Realtime Ticket Stream (supports Bearer or ?token=)
  - [x] `GET /tickets` — List dengan filter, search, sort, server-side pagination
  - [x] `GET /tickets/:id` — Detail + lampiran + history
  - [x] `POST /tickets` — Create (source: dashboard)
  - [x] `PATCH /tickets/:id` — Update status, catatan penanganan, severity
  - [x] `POST /tickets/:id/comments` — Input komentar / catatan penanganan
- [x] Register routes di `routes/index.js`

#### 4.3 Backend — Module Ticket History ✅ SELESAI
- [x] Auto-create history entry pada setiap perubahan ticket secara transaksional
- [x] Store old_value dan new_value sebagai JSON
- [x] Record timestamp WIB dan author (Admin user / Telegram user)

#### 4.4 Backend — Module Ticket Attachment
- [ ] Endpoint upload file attachment
- [ ] Validasi: max 5 file, max 10MB per file
- [ ] Storage strategy (local filesystem atau object storage)

### Phase 5 — Statistics & Analytics API

**Tujuan:** Backend API untuk dashboard analitik sesuai PRD Section 11 & 12.

- [ ] `modules/stats/stats.repository.js`
- [ ] `modules/stats/stats.service.js`
- [ ] `modules/stats/stats.controller.js`
- [ ] `modules/stats/stats.route.js`
- [ ] Endpoints:
  - `GET /stats/summary` — KPI: total tiket, distribusi status, MTTR, unit terdampak, perbandingan periode
  - `GET /stats/by-component` — Agregasi per component
  - `GET /stats/by-failure-code` — Pareto failure code
  - `GET /stats/trend` — Tren per hari/bulan
  - `GET /stats/by-client` — Per client
  - `GET /stats/by-location` — Per lokasi
  - `GET /stats/top-units` — Top 10 unit bermasalah
  - `GET /stats/executive-summary` — Insight otomatis (ES-01..ES-10 dari PRD)
- [ ] Global filter support: rentang tanggal, unit, client, lokasi, component, failure code, status, pelapor

### Phase 6 — Audit Log System

**Tujuan:** Pencatatan seluruh perubahan data penting.

- [ ] `modules/audit-log/audit-log.repository.js`
- [ ] `modules/audit-log/audit-log.service.js`
- [ ] `modules/audit-log/audit-log.controller.js`
- [ ] `modules/audit-log/audit-log.route.js`
- [ ] Endpoints:
  - `GET /audit-logs` — Daftar audit log + filter + pagination
  - `GET /audit-logs/:id` — Detail
- [ ] Middleware/utility untuk auto-log pada setiap operasi CUD (Create, Update, Delete)
- [ ] Integrasikan ke modul yang sudah ada: user, telegram, client, location, component, failure-code, asset, ticket

### Phase 7 — Export & Report ✅ SELESAI

**Tujuan:** Ekspor data tiket ke Excel/PDF.

- [x] Install library: `exceljs` (Excel) dan `pdfkit` (PDF streaming)
- [x] `modules/export/export.service.js` — Template Excel kaya styling (banner, header navy, auto-width, zebra stripe, status coloring) & PDF Landscape A4 dengan KPI summary cards dan table
- [x] `modules/export/export.controller.js` — Stream file `.xlsx` dan `.pdf` dengan content headers
- [x] `modules/export/export.route.js` — Endpoints:
  - [x] `GET /exports/excel` & `GET /tickets/export/excel`
  - [x] `GET /exports/pdf` & `GET /tickets/export/pdf`
- [x] Frontend Integration:
  - [x] Tombol Excel dan PDF di `TicketTable.jsx` langsung download file dari API
  - [x] Modal `ExportReportModal.jsx` mendukung format Excel / PDF dan filter periode data
  - [x] Filter aktif (search, status, component, client, lokasi) otomatis terikut pada hasil ekspor

### Phase 8 — Frontend Dashboard & Analytics

**Tujuan:** Dashboard KPI, analitik grafik, dan executive summary.

- [ ] Install chart library (recharts atau chart.js)
- [ ] Refactor `Dashboard.jsx` → terhubung API `/stats/summary`
  - KPI cards: total tiket, open, escalated, solved, MTTR, unit terdampak
  - Perbandingan vs periode sebelumnya
- [ ] Halaman Analitik Error (`/analitik-error`):
  - Grafik batang: tiket per component
  - Grafik Pareto: failure code (bar + garis kumulatif)
  - Grafik garis: tren harian/bulanan
  - Donat: distribusi status
  - Bar horizontal: per client, per lokasi
  - Heatmap: unit × component
  - Tabel top 10 unit
- [ ] Global filter panel: tanggal, bulan, unit, client, lokasi, component, failure code, status
  - Filter tercermin pada URL (query params) agar bisa dibagikan
- [ ] Halaman Executive Summary (`/executive-summary` atau bagian dari dashboard):
  - ES-01: 5 failure code tertinggi
  - ES-02: 5 failure code terendah
  - ES-03: Component penyumbang terbesar
  - ES-04: 5 unit paling bermasalah
  - ES-05: Unit paling sehat
  - ES-06: Kegagalan berulang
  - ES-07: Konsentrasi Pareto
  - ES-08: MTTR + sebaran
  - ES-09: Frekuensi kegagalan per unit-bulan
  - ES-10: Rasio kategori lain-lain

### Phase 9 — Frontend Ticket Integration

**Tujuan:** Hubungkan halaman tiket ke backend API (ganti mock data).

- [ ] Refactor `DaftarTiket.jsx`:
  - Hapus `INITIAL_TICKETS` mock data
  - Fetch dari `GET /tickets` dengan server-side pagination, search, filter
  - Gunakan global filter state
- [ ] Refactor `TicketDetailDrawer.jsx`:
  - Fetch detail dari `GET /tickets/:id`
  - Tampilkan history (timeline) + lampiran
- [ ] Implementasi update status tiket dari drawer (PATCH `/tickets/:id`)
- [ ] Export modal → trigger `POST /exports` API, polling status, download
- [ ] Halaman Audit Log (`/audit-log`):
  - Tabel audit log dengan filter aktor, tanggal, entity type
  - Pagination server-side

### Phase 10 — Bot Telegram Integration (n8n)

**Tujuan:** Setup n8n workflow yang terhubung ke PostgreSQL sesuai PRD flow.

- [ ] Setup n8n instance (self-hosted)
- [ ] Backend endpoints untuk bot:
  - `POST /bot/webhook` — Receive Telegram webhook
  - Query endpoints untuk bot session management
- [ ] Atau: n8n langsung query PostgreSQL (sesuai PRD "Desain Ulang Workflow n8n")
- [ ] Implementasi flow:
  - `/start`, `/help`, `/report`, `/ticket <ID>`, `/mytickets`, `/cancel`
  - Whitelist verification (FR-BOT-03)
  - Session management via `bot_sessions` table (FR-BOT-04)
  - Asset lookup (FR-BOT-05)
  - Component inline keyboard (FR-BOT-07)
  - Failure code inline keyboard + pagination (FR-BOT-08)
  - Detail parsing: KERUSAKAN, PENANGANAN, PENYEBAB, STATUS (FR-BOT-09/10)
  - Ticket ID generation: ERR-YYYYMMDD-NNNN (FR-BOT-12)
  - Confirmation message (FR-BOT-13)
  - Ticket update flow (FR-BOT-15/16)
  - Total waktu penanganan (FR-BOT-17)
- [ ] TelegramEvent idempotency (update_id unique constraint)
- [ ] TelegramGroup management

### Phase 11 — Responsiveness & Polish

- [ ] Responsif layout: tablet (768px) dan ponsel (360px) — FR-DSH-11
- [ ] Lokalisasi: seluruh UI berbahasa Indonesia
- [ ] Format tanggal: dd-mm-yyyy, waktu dalam WIB
- [ ] Pesan error yang informatif (bukan hanya "gagal")
- [ ] Loading states dan skeleton UI

### Phase 12 — Infra & Deployment

- [ ] Dockerfile untuk `error-service`
- [ ] Dockerfile untuk `interfaces` (multi-stage build)
- [ ] Docker Compose: app + postgres + nginx + n8n
- [ ] Nginx reverse proxy config
- [ ] Environment variable management (production)
- [ ] Dokumentasi deployment di `docs/deployment.md`

---

## 6. API Endpoints — Rencana Lengkap (Sesuai PRD Bab 11)

### Auth (✅ Sudah Ada)
| Method | Endpoint               | Role     | Status |
|--------|------------------------|----------|--------|
| POST   | `/auth/login`          | Public   | ✅     |
| POST   | `/auth/register`       | Public   | ✅     |
| POST   | `/auth/refresh`        | Cookie   | ✅     |
| POST   | `/auth/logout`         | Cookie   | ✅     |
| GET    | `/auth/me`             | Bearer   | ✅     |
| PATCH  | `/auth/change-password`| Bearer   | ✅     |

### User Management (✅ Sudah Ada)
| Method | Endpoint           | Role    | Status |
|--------|--------------------|---------|--------|
| POST   | `/users`           | ADMIN   | ✅     |
| GET    | `/users`           | ADMIN   | ✅     |
| GET    | `/users/:id`       | ADMIN   | ✅     |
| PATCH  | `/users/:id`       | ADMIN   | ✅     |
| DELETE | `/users/:id`       | ADMIN   | ✅     |

### Telegram Whitelist (✅ Sudah Ada)
| Method | Endpoint              | Role    | Status |
|--------|-----------------------|---------|--------|
| POST   | `/telegram-users`     | ADMIN   | ✅     |
| GET    | `/telegram-users`     | ADMIN   | ✅     |
| GET    | `/telegram-users/:id` | ADMIN   | ✅     |
| PATCH  | `/telegram-users/:id` | ADMIN   | ✅     |
| DELETE | `/telegram-users/:id` | ADMIN   | ✅     |

### Master Data (✅ Sudah Ada)
| Method | Endpoint             | Role    | Status |
|--------|----------------------|---------|--------|
| CRUD   | `/clients`           | ADMIN   | ✅     |
| CRUD   | `/locations`         | ADMIN   | ✅     |
| CRUD   | `/components`        | ADMIN   | ✅     |
| CRUD   | `/failure-codes`     | ADMIN   | ✅     |
| CRUD   | `/assets`            | ADMIN   | ✅     |

### Tickets (❌ Belum)
| Method | Endpoint             | Role        | Status |
|--------|----------------------|-------------|--------|
| GET    | `/tickets`           | VIEWER+     | ❌     |
| GET    | `/tickets/:id`       | VIEWER+     | ❌     |
| POST   | `/tickets`           | COORDINATOR | ❌     |
| PATCH  | `/tickets/:id`       | COORDINATOR | ❌     |

### Statistics (❌ Belum)
| Method | Endpoint                    | Role    | Status |
|--------|-----------------------------|---------|--------|
| GET    | `/stats/summary`            | VIEWER+ | ❌     |
| GET    | `/stats/by-component`       | VIEWER+ | ❌     |
| GET    | `/stats/by-failure-code`    | VIEWER+ | ❌     |
| GET    | `/stats/trend`              | VIEWER+ | ❌     |
| GET    | `/stats/by-client`          | VIEWER+ | ❌     |
| GET    | `/stats/by-location`        | VIEWER+ | ❌     |
| GET    | `/stats/top-units`          | VIEWER+ | ❌     |
| GET    | `/stats/executive-summary`  | VIEWER+ | ❌     |

### Audit Log (❌ Belum)
| Method | Endpoint            | Role    | Status |
|--------|---------------------|---------|--------|
| GET    | `/audit-logs`       | ADMIN   | ❌     |
| GET    | `/audit-logs/:id`   | ADMIN   | ❌     |

### Export (❌ Belum)
| Method | Endpoint          | Role        | Status |
|--------|-------------------|-------------|--------|
| POST   | `/exports`        | COORDINATOR | ❌     |
| GET    | `/exports`        | COORDINATOR | ❌     |
| GET    | `/exports/:id`    | COORDINATOR | ❌     |

---

## 7. Security Checklist

- [x] Password di-hash pakai bcrypt (salt rounds = 10)
- [x] Refresh token disimpan sebagai httpOnly + secure + sameSite cookie
- [x] Access token JWT expiry pendek (30 menit), refresh token panjang (1 hari) bisa di-revoke
- [x] Refresh token rotation: tiap refresh, token lama di-revoke
- [x] CORS dikonfigurasi (origin sesuai FRONTEND_URL)
- [x] Validasi input semua endpoint pakai Zod
- [x] Token Reuse Detection: refresh token yang sudah di-revoke → revoke semua sesi user
- [x] Simpan `userAgent` & `ipAddress` di refresh token untuk audit
- [ ] Rate limiting di endpoint `/auth/login` (tambah `express-rate-limit`)
- [ ] Audit log untuk seluruh operasi CUD
- [ ] Validasi role pada setiap endpoint (sudah partial via middleware)

---

## 8. Environment Variables

```env
# Backend (apps/error-service/.env)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/erad_db?schema=public
JWT_ACCESS_SECRET=<secret>
JWT_ACCESS_EXPIRES=30m
JWT_REFRESH_SECRET=<secret>
JWT_REFRESH_EXPIRES=1d
FRONTEND_URL=http://localhost:5173

# Frontend (apps/interfaces/.env)
VITE_API_BASE_URL=http://localhost:3000
```

---

## 9. Catatan Penting

1. **Schema Migration Risk:** Migrasi dari `@default(uuid())` ke `@default(dbgenerated("gen_random_uuid()"))` memerlukan extension `pgcrypto`. Data UUID existing tetap compatible.

2. **~~PasswordHash NOT NULL~~** ✅ **Terkonfirmasi:** `passwordHash` memang NOT NULL karena sistem sudah menggunakan default password = nama email user saat admin membuat akun baru. User tinggal ubah password sendiri setelahnya.

3. **~~TicketStatus enum~~** ✅ **Terkonfirmasi:** `escalated` menggantikan `monitor` dari PRD. Lifecycle final: `open → escalated → solved → closed`.

4. **FailureCode unique constraint:** Schema lama `@@unique([componentId, code])` berubah menjadi standalone `@unique` pada `code`. Ini berarti code harus unik secara global, bukan per-component. Sesuai PRD karena code sudah memakai prefix component (contoh: MPC-001).

5. **Timestamps:** Beberapa model di schema baru tidak menggunakan `@updatedAt` Prisma, melainkan nullable `DateTime?` yang harus di-set manual. Perlu update service layer untuk handle ini.

6. **~~Asset Timestamps~~** ✅ **Terkonfirmasi:** `Asset.createdAt` dan `Asset.updatedAt` memang dihapus di schema baru. Database sekarang mengikuti schema terbaru.

7. **n8n Bot vs Custom Bot:** PRD mengasumsikan bot Telegram dijalankan via n8n workflow yang terhubung langsung ke PostgreSQL. Jadi modul bot tidak dihandle oleh Express API, melainkan oleh n8n instance terpisah.

8. **DaftarTiket Mock Data:** Halaman `DaftarTiket.jsx` saat ini menggunakan `mockTickets.js`. Ini harus diganti dengan API call setelah backend ticket module siap.

9. **Chart Library:** PRD membutuhkan banyak visualisasi (bar, line, donut, heatmap, Pareto, box plot). Perlu install library chart seperti `recharts` atau `chart.js`.
