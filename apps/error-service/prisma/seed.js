import "dotenv/config";
import prisma from "../src/config/prisma.js";
import { seedData } from "./seed_data.js";
import { seedTicket } from "./seed_ticket.js";

async function main() {
  console.log("==================================================");
  console.log("🚀 MEMULAI PROSES SEED LENGKAP (DATA + TIKET)...");
  console.log("==================================================\n");

  // 1. Jalankan Seed Data (Users, Whitelist Telegram, Master Data, Teams)
  await seedData();

  // 2. Jalankan Seed Tiket (15 Dummy Tickets)
  await seedTicket();

  console.log("==================================================");
  console.log("🏆 SELURUH SEEDING (DATA & TIKET) SELESAI SEMPURNA!");
  console.log("==================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Gagal menjalankan seed lengkap:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
