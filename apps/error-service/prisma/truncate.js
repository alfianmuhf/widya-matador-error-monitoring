import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import prisma from "../src/config/prisma.js";
import { env } from "../src/config/env.js";
import Redis from "ioredis";
import amqp from "amqplib";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";

// Pastikan .env ter-load baik dari cwd maupun dari root error-service (mirip BE)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });

/**
 * 1. Fungsi untuk mengosongkan seluruh tabel di database PostgreSQL
 */
async function truncateDatabase() {
  console.log("==================================================");
  console.log("🗑️  1. MEMULAI TRUNCATE DATABASE POSTGRESQL...");
  console.log("==================================================");

  const tables = [
    "ticket_attachments",
    "ticket_teams",
    "team_members",
    "teams",
    "ticket_history",
    "tickets",
    "telegram_groups",
    "failure_codes",
    "components",
    "assets",
    "locations",
    "clients",
    "export_jobs",
    "audit_logs",
    "refresh_tokens",
    "telegram_events",
    "bot_sessions",
    "telegram_users",
    "users",
  ];

  try {
    const truncateQuery = `TRUNCATE TABLE ${tables.map((t) => `"${t}"`).join(", ")} CASCADE;`;
    await prisma.$executeRawUnsafe(truncateQuery);
    console.log("✅ Seluruh tabel database berhasil di-TRUNCATE (CASCADE)!");

    // Verifikasi jumlah baris
    console.log("\n📊 Verifikasi jumlah baris database:");
    for (const table of tables) {
      const countResult = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM "${table}"`
      );
      const count = countResult[0]?.count ?? 0;
      console.log(`   - ${table.padEnd(22)} : ${count} row`);
    }
  } catch (error) {
    console.warn(`⚠️  Peringatan saat mengosongkan Database: ${error.message} (Database PostgreSQL mungkin offline atau belum siap).`);
  }
}

/**
 * 2. Fungsi untuk mengosongkan seluruh objek di bucket Object Storage (S3 / MinIO / RustFS)
 */
async function truncateObjectStorage() {
  console.log("\n==================================================");
  console.log("🪣  2. MEMULAI PENGOSONGAN OBJECT STORAGE (BUCKET)...");
  console.log("==================================================");

  const endpoint = process.env.S3_ENDPOINT || env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET || env.S3_BUCKET;
  const accessKey = process.env.S3_ACCESS_KEY || env.S3_ACCESS_KEY;
  const secretKey = process.env.S3_SECRET_KEY || env.S3_SECRET_KEY;
  const region = process.env.S3_REGION || env.S3_REGION || "us-east-1";
  const forcePathStyle =
    (process.env.S3_FORCE_PATH_STYLE || env.S3_FORCE_PATH_STYLE || "true") !== "false";

  if (!endpoint || !bucket || !accessKey || !secretKey) {
    console.log("ℹ️  Object storage tidak dikonfigurasi lengkap di .env / process.env. Melewati pengosongan bucket.");
    return;
  }

  console.log(`Endpoint : ${endpoint}`);
  console.log(`Bucket   : ${bucket}`);
  console.log(`Region   : ${region}`);

  try {
    const s3 = new S3Client({
      endpoint,
      region,
      forcePathStyle,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });

    let totalDeleted = 0;
    let continuationToken;

    do {
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      });

      const listResponse = await s3.send(listCommand, {
        abortSignal: AbortSignal.timeout(4000),
      });
      const objects = listResponse.Contents || [];

      if (objects.length > 0) {
        const deleteParams = {
          Bucket: bucket,
          Delete: {
            Objects: objects.map((obj) => ({ Key: obj.Key })),
            Quiet: true,
          },
        };

        await s3.send(new DeleteObjectsCommand(deleteParams), {
          abortSignal: AbortSignal.timeout(4000),
        });
        totalDeleted += objects.length;
        console.log(`   ✓ Berhasil menghapus batch ${objects.length} objek...`);
      }

      continuationToken = listResponse.IsTruncated
        ? listResponse.NextContinuationToken
        : undefined;
    } while (continuationToken);

    console.log(`✅ Bucket '${bucket}' berhasil dikosongkan total! (Total ${totalDeleted} file/objek dihapus)`);
  } catch (error) {
    console.warn(`⚠️  Peringatan saat mengosongkan Object Storage: ${error.message} (Server Object Storage mungkin offline).`);
  }
}

/**
 * 3. Fungsi untuk mengosongkan Redis Cache (FLUSHDB)
 */
async function truncateRedis() {
  console.log("\n==================================================");
  console.log("⚡ 3. MEMULAI PENGOSONGAN REDIS CACHE...");
  console.log("==================================================");

  const host = process.env.REDIS_HOST || env.REDIS_HOST || "localhost";
  const port = parseInt(process.env.REDIS_PORT || env.REDIS_PORT || "6379", 10);
  const password = process.env.REDIS_PASSWORD || env.REDIS_PASSWORD || undefined;

  console.log(`Redis Server: ${host}:${port}`);

  let redis = null;
  try {
    redis = new Redis({
      host,
      port,
      password: password || undefined,
      lazyConnect: true,
      connectTimeout: 4000,
      maxRetriesPerRequest: 1,
    });

    await redis.connect();
    const keyCountBefore = await redis.dbsize();

    await redis.flushdb();
    console.log(`✅ Redis cache berhasil dikosongkan (FLUSHDB)! (Sebelumnya ada ${keyCountBefore} keys cache)`);
  } catch (error) {
    console.warn(`⚠️  Peringatan saat mengosongkan Redis: ${error.message} (Server Redis mungkin offline).`);
  } finally {
    if (redis) {
      try {
        await redis.quit();
      } catch {
        redis.disconnect();
      }
    }
  }
}

/**
 * 4. Fungsi untuk mengosongkan antrean RabbitMQ (Purge Queue)
 */
async function truncateRabbitMQ() {
  console.log("\n==================================================");
  console.log("🐰 4. MEMULAI PENGOSONGAN ANTREAN RABBITMQ...");
  console.log("==================================================");

  const url = process.env.RABBITMQ_URL;
  if (!url) {
    console.log("ℹ️  RABBITMQ_URL tidak diset di .env / process.env.");
    console.log("   (RabbitMQ belum terpasang atau tidak aktif di lokal). Melewati pembersihan antrean.");
    return;
  }

  const queuesToPurge = [
    "erad.telegram.notify",
    "erad.telegram.notify.dlx",
  ];

  let connection = null;
  let channel = null;

  try {
    const maskedUrl = url.replace(/:\/\/.*@/, "://***@");
    console.log(`Menghubungkan ke RabbitMQ: ${maskedUrl}...`);

    const connectPromise = amqp.connect(url);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Koneksi ke RabbitMQ timeout (3 detik)")), 3000)
    );

    connection = await Promise.race([connectPromise, timeoutPromise]);
    channel = await connection.createChannel();

    for (const queue of queuesToPurge) {
      try {
        const check = await channel.checkQueue(queue);
        if (check) {
          const res = await channel.purgeQueue(queue);
          console.log(`   ✓ Queue '${queue}' berhasil di-purge (${res.messageCount} pesan dibersihkan).`);
        }
      } catch (qErr) {
        console.log(`   ℹ️  Queue '${queue}' belum ada atau sudah kosong (${qErr.message}).`);
      }
    }

    console.log("✅ Seluruh antrean RabbitMQ berhasil dibersihkan!");
  } catch (error) {
    console.warn(`⚠️  Peringatan saat mengosongkan RabbitMQ: ${error.message} (Server RabbitMQ mungkin belum aktif).`);
  } finally {
    try {
      if (channel) await channel.close();
      if (connection) await connection.close();
    } catch {
      // ignore
    }
  }
}

/**
 * Main Truncate Runner
 */
async function main() {
  console.log("==================================================");
  console.log("⚠️  MEMULAI PROSES TRUNCATE TOTAL ERAD");
  console.log("   (Database PostgreSQL + Object Storage + Redis + RabbitMQ)");
  console.log("==================================================\n");

  try {
    // 1. Kosongkan PostgreSQL
    await truncateDatabase();

    // 2. Kosongkan Object Storage (Bucket S3)
    await truncateObjectStorage();

    // 3. Kosongkan Redis Cache
    await truncateRedis();

    // 4. Kosongkan RabbitMQ Queue (Jika aktif)
    await truncateRabbitMQ();

    console.log("\n==================================================");
    console.log("🎉 SELURUH DATA SISTEM BERHASIL DIBERSIHKAN TOTAL!");
    console.log("==================================================\n");
  } catch (err) {
    console.error("\n❌ Gagal menjalankan proses truncate:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
