import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";

async function main() {
  const email = process.env.ADMIN_EMAIL || "admin@widya.com";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "Super Admin";

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: "admin",
      status: "active",
      passwordHash,
      mustChangePassword: false,
    },
    create: {
      email,
      name,
      role: "admin",
      status: "active",
      passwordHash,
      mustChangePassword: false,
    },
  });

  console.log("✅ User Admin berhasil dibuat / diupdate:");
  console.log({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    status: admin.status,
    passwordDefault: password,
  });
}

main()
  .catch((e) => {
    console.error("❌ Gagal membuat user admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
