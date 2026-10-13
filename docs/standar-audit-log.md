# Standar Audit Log Sistem ERAD

Dokumen ini mendefinisikan standar format, struktur data, konvensi penamaan, dan protokol streaming Server-Sent Events (SSE) untuk pencatatan Audit Log di seluruh modul sistem ERAD.

---

## 1. Tampilan & Kolom Frontend (UI Standar)

Sesuai standar antarmuka ERAD, tabel Audit Log hanya menampilkan **5 kolom utama** tanpa modal detail dan tanpa menampilkan kolom internal `deleteAction`:

| No | Kolom | Format Tampilan | Contoh Nilai | Deskripsi & Aturan Styling |
|---|---|---|---|---|
| 1 | **Waktu** | `YYYY-MM-DD HH:mm` | `2026-09-08 08:41` | Waktu kejadian dalam zona WIB (UTC+7). Font monospace/regular netral (`text-slate-600`). |
| 2 | **Pelaku** | Email / Handle | `bruno@erad.id`, `fandi@erad.id` | Email pengguna yang melakukan aksi, username Telegram (`@username`), atau string aktor. |
| 3 | **Objek** | `${entity_type}:${identifier}` | `asset:LSP-018`, `ticket:ERR-20260907-0003`, `client:PT BGM 2` | Format gabungan nama entitas (snake_case) dan identifier manusiawi. Font monospace teal/cyan (`text-[#008ba3]`). |
| 4 | **Aksi** | Teks huruf kecil tebal | `create`, `update`, `status_change`, `delete` | Tipe aksi sistem dengan warna khas tanpa background bubble: <br>• `create`: Hijau tua (`text-[#15803d]`)<br>• `update`: Amber/Cokelat tua (`text-[#d97706]`)<br>• `status_change`: Teal (`text-[#0f766e]`)<br>• `delete`: Merah mawar (`text-[#e11d48]`) |
| 5 | **Detail perubahan** | String ringkasan perubahan | `lokasi: Yogyakarta → Probowangi`, `monitor → solved`, `tambah client baru` | Ringkasan perubahan manusiawi (human-readable string). Menjelaskan sebelum & sesudah atau konteks perubahan. |

---

## 2. Aturan Kolom `deleteAction` (Aturan Database & Backend)

Kolom `deleteAction` diatur secara ketat dengan enum:
- `NONE`: Digunakan untuk semua operasi selain `DELETE` (seperti `CREATE`, `UPDATE`, `STATUS_CHANGE`).
- `SOFT`: Digunakan saat entitas dihapus namun masih memiliki relasi terikat/nyangkut (misal aset memiliki riwayat tiket, lokasi memiliki aset). Status entitas diubah menjadi non-aktif (`isActive = false`).
- `HARD`: Digunakan saat entitas tidak memiliki dependensi aktif dan dapat dihapus permanen dari basis data (`DELETE FROM ...`).

> **Penting**: Kolom `deleteAction` **tidak dimunculkan** di tabel Audit Log frontend, namun tetap tersimpan di basis data dan dapat diakses untuk audit internal.

---

## 3. Format Objek (`entity_type:identifier`)

Format objek wajib mengikuti pola:
```text
${entity_type_snake_case}:${identifier_manusiawi}
```

| Tipe Entitas (`entityType`) | Contoh Hasil Objek | Keterangan Identifier |
|---|---|---|
| `Asset` | `asset:LSP-018` | Menggunakan `unitCode` |
| `Ticket` | `ticket:ERR-20260907-0003` | Menggunakan `ticketId` |
| `FailureCode` | `failure_code:JTS-003` | Menggunakan `code` |
| `TelegramUser` | `telegram_user:@nanda` | Menggunakan `@username` atau ID Telegram |
| `Client` | `client:PT BGM 2` | Menggunakan `name` |
| `Location` | `location:Yogyakarta` | Menggunakan `name` |
| `Component` | `component:Jetson Nano` | Menggunakan `name` |
| `User` | `user:fandi@erad.id` | Menggunakan `email` |

---

## 4. Format Detail Perubahan (`changeSummary`)

Setiap pemanggilan `recordLog` wajib menyertakan `identifier` dan `changeSummary` di dalam objek `details`:

```javascript
await recordLog({
  actor: actorUser?.email || "Sistem",
  actorUserId: actorUser?.id || null,
  action: "UPDATE", // "CREATE" | "UPDATE" | "STATUS_CHANGE" | "DELETE"
  deleteAction: "NONE", // "NONE" | "SOFT" | "HARD"
  entityType: "Asset",
  entityId: asset.id,
  details: {
    identifier: asset.unitCode,
    changeSummary: "lokasi: Yogyakarta → Probowangi", // Human-readable string
    before: { location: "Yogyakarta" },
    after: { location: "Probowangi" },
  },
}

### Pola Standar Ringkasan Perubahan:
- **Perubahan Nilai / Status**: `${field}: ${lama} → ${baru}`  
  Contoh: `lokasi: Yogyakarta → Probowangi`, `severity: medium → high`, `is_active: false → true`
- **Perubahan Status Tiket**: `${status_lama} → ${status_baru}`  
  Contoh: `monitor → solved`, `open → in_progress`
- **Penambahan Data**: `tambah ${nama_objek} baru`  
  Contoh: `tambah 'lain-lain' pada Jetson`, `tambah client baru`, `tambah lokasi 'Semarang'`
- **Penghapusan / Non-aktif**:  
  - Soft Delete: `soft delete: dinonaktifkan (${count} data terkait)`
  - Hard Delete: `hapus permanen ${nama_objek}`

---

## 5. Protokol Server-Sent Events (SSE)

### Endpoint:
```http
GET /audit-logs/stream?token={ACCESS_TOKEN}
```
Atau menggunakan header HTTP `Authorization: Bearer {ACCESS_TOKEN}`.

### Hak Akses:
Wajib role `ADMIN`.

### Format Pesan Stream:
1. **Inisialisasi Koneksi**:
   ```text
   event: init
   data: {"connected":true,"message":"Terhubung ke stream real-time Audit Log (SSE)","timestamp":"..."}
   ```
2. **Log Baru Tercipta**:
   ```text
   event: log_created
   data: {
     "id": "uuid",
     "waktu": "2026-09-21 00:10",
     "pelaku": "admin@widya.com",
     "objek": "client:PT BGM 2",
     "aksi": "create",
     "detailPerubahan": "tambah client baru",
     "deleteAction": "NONE",
     "entityType": "Client",
     "entityId": "uuid",
     "createdAt": "2026-09-20T17:10:26.043Z"
   }
   ```
3. **Heartbeat (Setiap 25 detik)**:
   ```text
   : heartbeat
   ```

### Integrasi Frontend:
```javascript
const eventSource = new EventSource(
  `${API_URL}/audit-logs/stream?token=${encodeURIComponent(token)}`,
  { withCredentials: true }
);

eventSource.addEventListener("log_created", (event) => {
  const newLog = JSON.parse(event.data);
  setLogs((prev) => [newLog, ...prev]);
});
```

---
## 6. Format Log Error Webhook

Ketika publish event ke RabbitMQ gagal, sistem mencatat log dengan format berikut:

**action**: `ERROR`
**entityType**: `Webhook`
**actor**: `Sistem`
**entityId**: `deliveryId` (uuid pesan)
**details** berisi:
- **identifier**: `routingKey` (string routing key event)
- **changeSummary**: `gagal publish event '<routingKey>' ke RabbitMQ: <pesan error>`

Contoh lengkap pembentukan log:
```javascript
await recordLog({
  actor: "Sistem",
  actorUserId: null,
  action: "ERROR",
  deleteAction: "NONE",
  entityType: "Webhook",
  entityId: "c1f7b7f1-88bc-4eb7-a720-3b9508bc5c6d",
  details: {
    identifier: "otp.password_reset",
    changeSummary: "gagal publish event 'otp.password_reset' ke RabbitMQ: Connection refused",
    routingKey: "otp.password_reset",
    deliveryId: "c1f7b7f1-88bc-4eb7-a720-3b9508bc5c6d",
  },
});
```

---