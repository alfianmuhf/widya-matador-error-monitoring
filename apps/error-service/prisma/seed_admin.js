import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";

export async function seedAdmin() {
  const saltRounds = 10;
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminName = process.env.ADMIN_NAME || "Super Admin";

  console.log("==================================================");
  console.log("🛡️  MEMULAI SEED ADMIN...");
  console.log("==================================================");

  // 1. Upsert Telegram Whitelist untuk Super Admin
  const teleAdmin = await prisma.telegram_users.upsert({
    where: { telegram_id: "123456789" },
    update: {
      username: "super_admin",
      full_name: "Super Admin",
      division: "none",
      is_active: true,
    },
    create: {
      telegram_id: "123456789",
      username: "super_admin",
      full_name: "Super Admin",
      division: "none",
      is_active: true,
    },
  });
  console.log(`✓ Telegram Whitelist: @${teleAdmin.username} (ID: ${teleAdmin.telegram_id})`);

  // 2. Upsert Akun Admin
  const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
  const adminUser = await prisma.users.upsert({
    where: { username: adminUsername },
    update: {
      name: adminName,
      role: "admin",
      division: "none",
      status: "active",
      password_hash: passwordHash,
      must_change_password: false,
      failed_login_attempts: 0,
      locked_until: null,
      telegram_user_id: teleAdmin.id,
    },
    create: {
      username: adminUsername,
      name: adminName,
      role: "admin",
      division: "none",
      status: "active",
      password_hash: passwordHash,
      must_change_password: false,
      failed_login_attempts: 0,
      telegram_user_id: teleAdmin.id,
    },
  });

  console.log(`✓ User Admin: ${adminUser.name} (@${adminUser.username}) - status: ${adminUser.status}`);
  console.log("--------------------------------------------------");
  console.log("🔑 Kredensial Login Admin:");
  console.log(`   Username : ${adminUsername}`);
  console.log(`   Password : ${adminPassword}`);
  console.log(`   Peran    : ADMIN`);
  console.log("==================================================\n");

  return adminUser;
}

// Jalankan langsung jika file dieksekusi secara mandiri
if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed_admin.js")) {
  seedAdmin()
    .catch((err) => {
      console.error("❌ Gagal seed admin:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
