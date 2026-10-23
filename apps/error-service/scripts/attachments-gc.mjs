/**
 * Rekonsiliasi lampiran: hapus objek di bucket yang tidak punya baris
 * ticket_attachments, dan laporkan baris yang objeknya hilang.
 *
 * Jalankan manual (tidak pernah dipanggil dari request path):
 *   npm run attachments:gc -- --dry-run   # lihat apa yang akan dihapus
 *   npm run attachments:gc                # hapus objek yatim
 */
import prisma from "../src/config/prisma.js";
import { deleteObject, isConfigured, listObjects } from "../src/modules/attachment/attachment.storage.js";

const PREFIX = "tickets/";
// Upload menulis objek sebelum barisnya. Objek yang lebih muda dari ini bisa
// jadi milik upload yang sedang berjalan, bukan yatim.
const MIN_AGE_MS = 60 * 60 * 1000;
const dryRun = process.argv.includes("--dry-run");

const main = async () => {
  if (!isConfigured()) {
    console.error("Storage belum dikonfigurasi (S3_ENDPOINT/S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY).");
    process.exit(1);
  }

  const objects = await listObjects(PREFIX);
  const rows = await prisma.ticket_attachments.findMany({ select: { id: true, file_url: true } });

  const knownKeys = new Set(rows.map((row) => row.file_url));
  const storedKeys = new Set(objects.map((object) => object.key));
  const cutoff = Date.now() - MIN_AGE_MS;

  const older = (object) => object.lastModified && object.lastModified.getTime() < cutoff;

  const orphans = objects.filter((object) => !knownKeys.has(object.key));
  const orphanKeys = orphans.filter(older);
  const skipped = orphans.filter((object) => !older(object));
  const missingObjects = rows.filter((row) => !storedKeys.has(row.file_url));

  console.log(`Objek di bucket: ${objects.length}`);
  console.log(`Baris di database: ${rows.length}`);
  console.log(`Objek yatim: ${orphanKeys.length}`);
  console.log(`Dilewati (lebih muda dari 60 menit): ${skipped.length}`);
  console.log(`Baris tanpa objek: ${missingObjects.length}`);

  for (const object of skipped) {
    console.log(`[dilewati] objek baru, mungkin upload berjalan: ${object.key}`);
  }

  for (const key of orphanKeys.map((object) => object.key)) {
    if (dryRun) {
      console.log(`[dry-run] hapus objek: ${key}`);
      continue;
    }
    await deleteObject(key);
    console.log(`dihapus: ${key}`);
  }

  // Baris tanpa objek sengaja hanya dilaporkan: menghapusnya akan menyembunyikan
  // kehilangan data storage, bukan memperbaikinya.
  for (const row of missingObjects) {
    console.warn(`[perlu diperiksa] baris ${row.id} menunjuk objek hilang: ${row.file_url}`);
  }
};

main()
  .catch((error) => {
    console.error("Gagal menjalankan attachments-gc:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
