import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";

export async function seedData() {
  const saltRounds = 10;
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  console.log("==================================================");
  console.log("🌱 MEMULAI SEED DATA (USERS, MASTER DATA, & TEAMS)...");
  console.log("==================================================\n");

  // =========================================================================
  // 1. SEED TELEGRAM USERS (Whitelist Telegram)
  // =========================================================================
  console.log("📱 [1/4] Seeding Telegram Whitelist Users (14 akun active)...");

  const telegramUsersToSeed = [
    // 1 Admin
    {
      telegram_id: "123456789",
      username: "super_admin",
      full_name: "Super Admin",
      division: "none",
      is_active: true,
    },
    // 2 Aftersales
    {
      telegram_id: "682910291",
      username: "bruno_aftersales",
      full_name: "Bruno Aftersales 1",
      division: "after_sales",
      is_active: true,
    },
    {
      telegram_id: "719283741",
      username: "bayu_aftersales",
      full_name: "Bayu Aftersales 2",
      division: "after_sales",
      is_active: true,
    },
    // 10 RnD
    {
      telegram_id: "829104829",
      username: "siti_rnd",
      full_name: "Siti RnD Software",
      division: "rnd",
      is_active: true,
    },
    {
      telegram_id: "918273645",
      username: "surya_rnd",
      full_name: "Surya RnD Hardware",
      division: "rnd",
      is_active: true,
    },
    {
      telegram_id: "6981508786",
      username: "iniqiblat",
      full_name: "Queen Qiblattul Qur'aini",
      division: "rnd",
      is_active: true,
    },
    {
      telegram_id: "837192841",
      username: "fajar_rnd",
      full_name: "Fajar Software Dev",
      division: "rnd",
      is_active: true,
    },
    {
      telegram_id: "849201932",
      username: "rudi_rnd",
      full_name: "Rudi Software Backend",
      division: "rnd",
      is_active: true,
    },
    {
      telegram_id: "850312043",
      username: "reza_rnd",
      full_name: "Reza Computer Vision",
      division: "rnd",
      is_active: true,
    },
    {
      telegram_id: "861423154",
      username: "dian_rnd",
      full_name: "Dian Embedded Firmware",
      division: "rnd",
      is_active: true,
    },
    {
      telegram_id: "872534265",
      username: "ilham_rnd",
      full_name: "Ilham Hardware Lead Tech",
      division: "rnd",
      is_active: true,
    },
    {
      telegram_id: "883645376",
      username: "anita_rnd",
      full_name: "Anita Hardware Electronics",
      division: "rnd",
      is_active: true,
    },
    {
      telegram_id: "894756487",
      username: "gilang_rnd",
      full_name: "Gilang Sensor Specialist",
      division: "rnd",
      is_active: true,
    },
    // 1 Viewer
    {
      telegram_id: "564738291",
      username: "dimas_viewer",
      full_name: "Dimas Viewer",
      division: "none",
      is_active: true,
    },
  ];

  const telegramMap = new Map();
  for (const tg of telegramUsersToSeed) {
    const tgRecord = await prisma.telegram_users.upsert({
      where: { telegram_id: tg.telegram_id },
      update: {
        username: tg.username,
        full_name: tg.full_name,
        division: tg.division,
        is_active: tg.is_active,
      },
      create: {
        telegram_id: tg.telegram_id,
        username: tg.username,
        full_name: tg.full_name,
        division: tg.division,
        is_active: tg.is_active,
      },
    });
    telegramMap.set(tg.username, tgRecord);
    console.log(
      `   ✓ [@${tgRecord.username}] ${tgRecord.full_name} (ID: ${tgRecord.telegram_id}) - status: active`
    );
  }

  // =========================================================================
  // 2. SEED USERS (1 Admin + 2 Aftersales + 10 RnD + 1 Viewer = 14 Users)
  // =========================================================================
  console.log("\n👤 [2/4] Seeding Users (1 Admin, 2 Aftersales, 10 RnD, 1 Viewer)...");

  const usersToSeed = [
    // 1 Admin
    {
      username: process.env.ADMIN_USERNAME || "admin",
      name: process.env.ADMIN_NAME || "Super Admin",
      role: "admin",
      division: "none",
      status: "active",
      must_change_password: false,
      rawPassword: adminPassword,
      telegramUsername: "super_admin",
    },
    // 2 Coordinator Aftersales
    {
      username: "bruno",
      name: "Bruno Aftersales 1",
      role: "coordinator",
      division: "after_sales",
      status: "invited",
      must_change_password: true,
      rawPassword: "bruno12345",
      telegramUsername: "bruno_aftersales",
    },
    {
      username: "bayu",
      name: "Bayu Aftersales 2",
      role: "coordinator",
      division: "after_sales",
      status: "invited",
      must_change_password: true,
      rawPassword: "bayu12345",
      telegramUsername: "bayu_aftersales",
    },
    // 10 Coordinator RnD
    // -- Tim Software (5 akun)
    {
      username: "siti",
      name: "Siti RnD Software",
      role: "coordinator",
      division: "rnd",
      status: "invited",
      must_change_password: true,
      rawPassword: "siti12345",
      telegramUsername: "siti_rnd",
    },
    {
      username: "queen",
      name: "Queen Qiblattul Qur'aini",
      role: "coordinator",
      division: "rnd",
      status: "invited",
      must_change_password: true,
      rawPassword: "queen12345",
      telegramUsername: "iniqiblat",
    },
    {
      username: "fajar",
      name: "Fajar Software Dev",
      role: "coordinator",
      division: "rnd",
      status: "invited",
      must_change_password: true,
      rawPassword: "fajar12345",
      telegramUsername: "fajar_rnd",
    },
    {
      username: "rudi",
      name: "Rudi Software Backend",
      role: "coordinator",
      division: "rnd",
      status: "invited",
      must_change_password: true,
      rawPassword: "rudi12345",
      telegramUsername: "rudi_rnd",
    },
    {
      username: "reza",
      name: "Reza Computer Vision",
      role: "coordinator",
      division: "rnd",
      status: "invited",
      must_change_password: true,
      rawPassword: "reza12345",
      telegramUsername: "reza_rnd",
    },
    // -- Tim Hardware (5 akun)
    {
      username: "surya",
      name: "Surya RnD Hardware",
      role: "coordinator",
      division: "rnd",
      status: "invited",
      must_change_password: true,
      rawPassword: "surya12345",
      telegramUsername: "surya_rnd",
    },
    {
      username: "dian",
      name: "Dian Embedded Firmware",
      role: "coordinator",
      division: "rnd",
      status: "invited",
      must_change_password: true,
      rawPassword: "dian12345",
      telegramUsername: "dian_rnd",
    },
    {
      username: "ilham",
      name: "Ilham Hardware Lead Tech",
      role: "coordinator",
      division: "rnd",
      status: "invited",
      must_change_password: true,
      rawPassword: "ilham12345",
      telegramUsername: "ilham_rnd",
    },
    {
      username: "anita",
      name: "Anita Hardware Electronics",
      role: "coordinator",
      division: "rnd",
      status: "invited",
      must_change_password: true,
      rawPassword: "anita12345",
      telegramUsername: "anita_rnd",
    },
    {
      username: "gilang",
      name: "Gilang Sensor Specialist",
      role: "coordinator",
      division: "rnd",
      status: "invited",
      must_change_password: true,
      rawPassword: "gilang12345",
      telegramUsername: "gilang_rnd",
    },
    // 1 Viewer
    {
      username: "dimas",
      name: "Dimas Viewer",
      role: "viewer",
      division: "none",
      status: "invited",
      must_change_password: true,
      rawPassword: "dimas12345",
      telegramUsername: "dimas_viewer",
    },
  ];

  const userMap = new Map();
  for (const u of usersToSeed) {
    const passwordHash = await bcrypt.hash(u.rawPassword, saltRounds);
    const linkedTelegram = u.telegramUsername ? telegramMap.get(u.telegramUsername) : null;

    const userRecord = await prisma.users.upsert({
      where: { username: u.username },
      update: {
        name: u.name,
        role: u.role,
        division: u.division,
        status: u.status,
        password_hash: passwordHash,
        must_change_password: u.must_change_password,
        failed_login_attempts: 0,
        locked_until: null,
        telegram_user_id: linkedTelegram ? linkedTelegram.id : null,
      },
      create: {
        username: u.username,
        name: u.name,
        role: u.role,
        division: u.division,
        status: u.status,
        password_hash: passwordHash,
        must_change_password: u.must_change_password,
        failed_login_attempts: 0,
        telegram_user_id: linkedTelegram ? linkedTelegram.id : null,
      },
    });

    userMap.set(u.username, userRecord);
    console.log(
      `   ✓ [${userRecord.role.toUpperCase()}] ${userRecord.name} (@${userRecord.username}) - telegram: ${linkedTelegram ? `@${linkedTelegram.username}` : "-"} - status: ${userRecord.status}`
    );
  }

  // =========================================================================
  // 3. SEED MASTER DATA
  // =========================================================================
  console.log("\n📦 [3/4] Seeding Master Data (Clients, Locations, Components, Failure Codes, Assets)...");

  // A. Clients (5)
  console.log("   --- Clients (5 data) ---");
  const clientsData = [
    { name: "PT Vale Indonesia", is_active: true },
    { name: "PT Freeport Indonesia", is_active: true },
    { name: "PT Bukit Asam Tbk", is_active: true },
    { name: "PT Adaro Energy Tbk", is_active: true },
    { name: "PT Berau Coal", is_active: true },
  ];
  const clientMap = new Map();
  for (const c of clientsData) {
    const record = await prisma.clients.upsert({
      where: { name: c.name },
      update: { is_active: c.is_active },
      create: { name: c.name, is_active: c.is_active },
    });
    clientMap.set(c.name, record);
    console.log(`      ✓ Client: ${record.name}`);
  }

  // B. Locations (5)
  console.log("   --- Lokasi (5 data) ---");
  const locationsData = [
    { name: "Sorowako Site (Sulawesi Selatan)", is_active: true },
    { name: "Grasberg Mine (Papua Tengah)", is_active: true },
    { name: "Tanjung Enim Mine (Sumatera Selatan)", is_active: true },
    { name: "Tabang Coal Mine (Kalimantan Timur)", is_active: true },
    { name: "Lati Mine Operation (Kalimantan Timur)", is_active: true },
  ];
  const locationMap = new Map();
  for (const loc of locationsData) {
    const record = await prisma.locations.upsert({
      where: { name: loc.name },
      update: { is_active: loc.is_active },
      create: { name: loc.name, is_active: loc.is_active },
    });
    locationMap.set(loc.name, record);
    console.log(`      ✓ Lokasi: ${record.name}`);
  }

  // C. Components (5)
  console.log("   --- Komponen (5 data) ---");
  const componentsData = [
    { prefix: "LDR", name: "LiDAR Sensor Module", sort_order: 1, is_active: true },
    { prefix: "CAM", name: "Optical High-Res Camera", sort_order: 2, is_active: true },
    { prefix: "PWR", name: "Power Management & Battery", sort_order: 3, is_active: true },
    { prefix: "CMP", name: "Industrial PC & Computing Unit", sort_order: 4, is_active: true },
    { prefix: "NET", name: "Telemetry & 4G/5G Gateway", sort_order: 5, is_active: true },
  ];
  const componentMap = new Map();
  for (const comp of componentsData) {
    const record = await prisma.components.upsert({
      where: { prefix: comp.prefix },
      update: {
        name: comp.name,
        sort_order: comp.sort_order,
        is_active: comp.is_active,
      },
      create: {
        prefix: comp.prefix,
        name: comp.name,
        sort_order: comp.sort_order,
        is_active: comp.is_active,
      },
    });
    componentMap.set(comp.prefix, record);
    console.log(`      ✓ Komponen: [${record.prefix}] ${record.name}`);
  }

  // D. Failure Codes (5)
  console.log("   --- Failure Code (5 data) ---");
  const failureCodesData = [
    {
      componentPrefix: "LDR",
      code: "LDR-01",
      name: "Point Cloud Dropout",
      description: "Kehilangan pantulan laser atau densitas point cloud di bawah ambang batas toleransi",
      is_active: true,
    },
    {
      componentPrefix: "CAM",
      code: "CAM-01",
      name: "Sensor Exposure Glitch",
      description: "Gambar visual overexposed atau mengalami noise artefak saat proses pemindaian",
      is_active: true,
    },
    {
      componentPrefix: "PWR",
      code: "PWR-01",
      name: "Battery Voltage Sag",
      description: "Penurunan tegangan mendadak di bawah 22V saat prosesor computing aktif penuh",
      is_active: true,
    },
    {
      componentPrefix: "CMP",
      code: "CMP-01",
      name: "CPU Thermal Throttle",
      description: "Temperatur prosesor IPC melebihi 85°C sehingga pemrosesan frame tertunda",
      is_active: true,
    },
    {
      componentPrefix: "NET",
      code: "NET-01",
      name: "Cellular Packet Loss",
      description: "Koneksi gateway telemetri tidak stabil dan tingkat packet loss > 15%",
      is_active: true,
    },
  ];
  for (const fc of failureCodesData) {
    const parentComp = componentMap.get(fc.componentPrefix);
    if (!parentComp) continue;

    const record = await prisma.failure_codes.upsert({
      where: {
        component_id_code: {
          component_id: parentComp.id,
          code: fc.code,
        },
      },
      update: {
        name: fc.name,
        description: fc.description,
        is_active: fc.is_active,
      },
      create: {
        component_id: parentComp.id,
        code: fc.code,
        name: fc.name,
        description: fc.description,
        is_active: fc.is_active,
      },
    });
    console.log(`      ✓ Failure Code: [${record.code}] ${record.name} (${fc.componentPrefix})`);
  }

  // E. Assets (Unit Load Scanner - 5 data)
  console.log("   --- Unit Load Scanner / Asset (5 data) ---");
  const assetsData = [
    {
      unit_code: "WLS-001",
      asset_type: "portable",
      clientName: "PT Vale Indonesia",
      locationName: "Sorowako Site (Sulawesi Selatan)",
      status: "active",
      commissioning_date: new Date("2024-01-15"),
      is_active: true,
    },
    {
      unit_code: "WLS-002",
      asset_type: "static",
      clientName: "PT Freeport Indonesia",
      locationName: "Grasberg Mine (Papua Tengah)",
      status: "active",
      commissioning_date: new Date("2024-03-20"),
      is_active: true,
    },
    {
      unit_code: "WLS-003",
      asset_type: "portable",
      clientName: "PT Bukit Asam Tbk",
      locationName: "Tanjung Enim Mine (Sumatera Selatan)",
      status: "maintenance",
      commissioning_date: new Date("2024-05-10"),
      is_active: true,
    },
    {
      unit_code: "WLS-004",
      asset_type: "static",
      clientName: "PT Adaro Energy Tbk",
      locationName: "Tabang Coal Mine (Kalimantan Timur)",
      status: "active",
      commissioning_date: new Date("2024-07-01"),
      is_active: true,
    },
    {
      unit_code: "WLS-005",
      asset_type: "portable",
      clientName: "PT Berau Coal",
      locationName: "Lati Mine Operation (Kalimantan Timur)",
      status: "retired",
      commissioning_date: new Date("2023-11-12"),
      is_active: true,
    },
  ];
  for (const ast of assetsData) {
    const client = clientMap.get(ast.clientName);
    const location = locationMap.get(ast.locationName);
    if (!client || !location) continue;

    const record = await prisma.assets.upsert({
      where: { unit_code: ast.unit_code },
      update: {
        asset_type: ast.asset_type,
        client_id: client.id,
        location_id: location.id,
        status: ast.status,
        commissioning_date: ast.commissioning_date,
        is_active: ast.is_active,
      },
      create: {
        unit_code: ast.unit_code,
        asset_type: ast.asset_type,
        client_id: client.id,
        location_id: location.id,
        status: ast.status,
        commissioning_date: ast.commissioning_date,
        is_active: ast.is_active,
      },
    });
    console.log(
      `      ✓ Asset: ${record.unit_code} (${record.asset_type}) - ${ast.clientName} - status: ${record.status}`
    );
  }

  // =========================================================================
  // 4. SEED TEAMS & TEAM MEMBERS (2 Teams: Software & Hardware)
  // =========================================================================
  console.log("\n👥 [4/4] Seeding RnD Teams & Members (Software & Hardware)...");

  const sitiUser = userMap.get("siti");
  const suryaUser = userMap.get("surya");
  const queenUser = userMap.get("queen");
  const fajarUser = userMap.get("fajar");
  const rudiUser = userMap.get("rudi");
  const rezaUser = userMap.get("reza");
  const dianUser = userMap.get("dian");
  const ilhamUser = userMap.get("ilham");
  const anitaUser = userMap.get("anita");
  const gilangUser = userMap.get("gilang");

  // Hapus relasi team_members lama untuk inisialisasi ulang yang rapi
  await prisma.team_members.deleteMany();

  // 1. Team RnD - Software
  const rndSwTeam = await prisma.teams.upsert({
    where: { name: "RnD - Software" },
    update: {
      leader_user_id: sitiUser.id,
      is_active: true,
    },
    create: {
      name: "RnD - Software",
      leader_user_id: sitiUser.id,
      is_active: true,
    },
  });

  // 2. Team RnD - Hardware
  const rndHwTeam = await prisma.teams.upsert({
    where: { name: "RnD - Hardware" },
    update: {
      leader_user_id: suryaUser.id,
      is_active: true,
    },
    create: {
      name: "RnD - Hardware",
      leader_user_id: suryaUser.id,
      is_active: true,
    },
  });

  // Hubungkan 5 anggota ke tim Software (siti, queen, fajar, rudi, reza)
  const softwareMembers = [sitiUser, queenUser, fajarUser, rudiUser, rezaUser];
  for (const m of softwareMembers) {
    await prisma.team_members.upsert({
      where: {
        team_id_user_id: {
          team_id: rndSwTeam.id,
          user_id: m.id,
        },
      },
      update: {},
      create: {
        team_id: rndSwTeam.id,
        user_id: m.id,
      },
    });
  }

  // Hubungkan 5 anggota ke tim Hardware (surya, dian, ilham, anita, gilang)
  const hardwareMembers = [suryaUser, dianUser, ilhamUser, anitaUser, gilangUser];
  for (const m of hardwareMembers) {
    await prisma.team_members.upsert({
      where: {
        team_id_user_id: {
          team_id: rndHwTeam.id,
          user_id: m.id,
        },
      },
      update: {},
      create: {
        team_id: rndHwTeam.id,
        user_id: m.id,
      },
    });
  }

  console.log(`      ✓ Team 1: ${rndSwTeam.name} (Leader: ${sitiUser.name}, 5 Anggota)`);
  console.log(`      ✓ Team 2: ${rndHwTeam.name} (Leader: ${suryaUser.name}, 5 Anggota)`);

  console.log("\n==================================================");
  console.log("🎉 SEED DATA SELESAI DENGAN SUKSES!");
  console.log("==================================================");
  console.log("🔑 Kredensial Pengguna (Total 14 Akun):");
  console.log("   - Admin       : admin / admin123");
  console.log("   - Aftersales 1: bruno / bruno12345");
  console.log("   - Aftersales 2: bayu  / bayu12345");
  console.log("   - RnD SW (L)  : siti  / siti12345");
  console.log("   - RnD SW      : queen / queen12345, fajar / fajar12345, rudi / rudi12345, reza / reza12345");
  console.log("   - RnD HW (L)  : surya / surya12345");
  console.log("   - RnD HW      : dian / dian12345, ilham / ilham12345, anita / anita12345, gilang / gilang12345");
  console.log("   - Viewer      : dimas / dimas12345");
  console.log("==================================================\n");

  return {
    userMap,
    rndSwTeam,
    rndHwTeam,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed_data.js")) {
  seedData()
    .catch((err) => {
      console.error("❌ Gagal seed data:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
