import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";

async function main() {
  const saltRounds = 10;
  const defaultPassword = process.env.ADMIN_PASSWORD || "admin123";
  const defaultPasswordHash = await bcrypt.hash(defaultPassword, saltRounds);

  const seedUsers = [
    {
      email: process.env.ADMIN_EMAIL || "admin@widya.com",
      name: process.env.ADMIN_NAME || "Super Admin",
      role: "admin",
      division: "none",
      status: "active",
      must_change_password: false,
      password: defaultPassword,
    },
    {
      email: "bruno@erad.id",
      name: "Bruno Aftersales",
      role: "coordinator",
      division: "after_sales",
      status: "active",
      must_change_password: false,
      password: defaultPassword,
    },
    {
      email: "siti@erad.id",
      name: "Siti Software Leader",
      role: "coordinator",
      division: "software",
      status: "active",
      must_change_password: false,
      password: defaultPassword,
    },
    {
      email: "dimas@erad.id",
      name: "Dimas Software",
      role: "viewer",
      division: "software",
      status: "active",
      must_change_password: false,
      password: defaultPassword,
    },
  ];

  console.log("🌱 Memulai seeding user ke database...");

  for (const u of seedUsers) {
    const passwordHash = u.password === defaultPassword ? defaultPasswordHash : await bcrypt.hash(u.password, saltRounds);

    const user = await prisma.users.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        division: u.division,
        status: u.status,
        password_hash: passwordHash,
        must_change_password: u.must_change_password,
        failed_login_attempts: 0,
        locked_until: null,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        division: u.division,
        status: u.status,
        password_hash: passwordHash,
        must_change_password: u.must_change_password,
        failed_login_attempts: 0,
      },
    });

    console.log(`✅ User berhasil dibuat / diupdate: [${user.role.toUpperCase()}] ${user.name} (${user.email})`);
  }

  console.log("\n🔑 Kredensial Login:");
  console.log("--------------------------------------------------");
  console.log(`• Admin       : ${seedUsers[0].email} / ${defaultPassword}`);
  console.log(`• Aftersales  : ${seedUsers[1].email} / ${defaultPassword}`);
  console.log(`• Software (L): ${seedUsers[2].email} / ${defaultPassword}`);
  console.log(`• Software (M): ${seedUsers[3].email} / ${defaultPassword}`);
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Gagal seeding user:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
