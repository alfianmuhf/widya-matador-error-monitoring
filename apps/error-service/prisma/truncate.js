import "dotenv/config";
import prisma from "../src/config/prisma.js";

async function truncateAll() {
  console.log("⚠️  MEMULAI TRUNCATE SEMUA TABEL DATABASE ERAD...\n");

  const tables = [
    "ticket_assignees",
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
    "users"
  ];

  try {
    const truncateQuery = `TRUNCATE TABLE ${tables.map(t => `"${t}"`).join(", ")} CASCADE;`;
    console.log("Menjalankan query:");
    console.log(truncateQuery);
    
    await prisma.$executeRawUnsafe(truncateQuery);

    console.log("\n✅ SELURUH TABEL BERHASIL DITRUNCATE (BERSIH TOTAL)!");

    // Verifikasi jumlah row tiap tabel
    console.log("\n📊 Verifikasi jumlah row:");
    for (const table of tables) {
      const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM "${table}"`);
      const count = countResult[0]?.count ?? 0;
      console.log(`- ${table.padEnd(20)} : ${count} row`);
    }

  } catch (error) {
    console.error("❌ Gagal melakukan truncate:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

truncateAll();
