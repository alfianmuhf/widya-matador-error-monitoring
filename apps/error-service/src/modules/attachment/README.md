# Attachment Module

Lampiran gambar tiket: satu file per request, maksimal 5 per tiket, maksimal 5 MB, selalu dikonversi ke WebP.

## Konvensi penting

`ticket_attachments.file_url` menyimpan **key relatif bucket**, bukan URL:

```
tickets/ERR-20261022-0001/6f1c2b7e-1f0a-4a4e-9a4e-2f6d1c9b7a11.webp
```

Tidak ada skema, host, port, atau nama bucket di database. Konsekuensinya:

- Ganti provider (RustFS → MinIO/R2/S3) cukup ubah `S3_*` dan copy objek dengan key yang sama.
- Jangan pernah menyimpan presigned URL — kedaluwarsa.
- URL yang dikirim ke client dibentuk saat baca: `/tickets/:id/attachments/:attachmentId/content`.

## Alur upload

```
authorise → cek kuota (count by ticket_id) → generate uuid → sharp (rotate → 1920 → webp q82)
          → putObject → insert row
```

Objek ditulis sebelum baris dibuat. Kegagalan storage tidak boleh meninggalkan baris yatim; kegagalan insert hanya meninggalkan objek yatim yang bisa dibersihkan.

## Konversi

- `.rotate()` wajib: sharp membuang EXIF, tanpa itu foto portrait tampil miring.
- `withoutEnlargement` mencegah gambar kecil di-upscale.
- `limitInputPixels: 50_000_000` membatasi decompression bomb.
- `image/svg+xml` ditolak sebelum sharp dipanggil.
- Konversi di FE hanya optimasi; BE selalu encode ulang.

## Perawatan

Objek yatim (tiket dihapus → baris cascade, objek tertinggal):

```bash
node scripts/attachments-gc.mjs --dry-run   # lihat kandidat
node scripts/attachments-gc.mjs             # hapus objek tanpa baris
```

Script ini juga melaporkan baris yang objeknya hilang — itu indikasi volume storage tidak ikut ter-backup, dan tidak diperbaiki otomatis.
