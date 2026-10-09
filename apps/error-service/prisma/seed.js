import "dotenv/config";
import bcrypt from "bcrypt";
import prisma from "../src/config/prisma.js";

async function main() {
  const saltRounds = 10;
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  console.log("==================================================");
  console.log("🌱 MEMULAI SEEDING DATABASE ERAD...");
  console.log("==================================================\n");

  // =========================================================================
  // 1. SEED USERS (1 Admin [active] + 3 Coordinator/Viewer [invited])
  // =========================================================================
  console.log("👤 [1/4] Seeding Users...");

  const usersToSeed = [
    // 1 Admin (Status Active)
    {
      email: process.env.ADMIN_EMAIL || "admin@widya.com",
      name: process.env.ADMIN_NAME || "Super Admin",
      role: "admin",
      division: "none",
      status: "active",
      must_change_password: false,
      rawPassword: adminPassword,
    },
    // 3 Coordinator / Viewer (Status Invited, Initial Password [prefix]12345)
    {
      email: "bruno@erad.id",
      name: "Bruno Aftersales",
      role: "coordinator",
      division: "after_sales",
      status: "invited",
      must_change_password: true,
      rawPassword: "bruno12345",
    },
    {
      email: "siti@erad.id",
      name: "Siti Software Leader",
      role: "coordinator",
      division: "software",
      status: "invited",
      must_change_password: true,
      rawPassword: "siti12345",
    },
    {
      email: "dimas@erad.id",
      name: "Dimas Software Viewer",
      role: "viewer",
      division: "software",
      status: "invited",
      must_change_password: true,
      rawPassword: "dimas12345",
    },
  ];

  const seededUsers = [];
  for (const u of usersToSeed) {
    const passwordHash = await bcrypt.hash(u.rawPassword, saltRounds);

    const userRecord = await prisma.users.upsert({
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

    seededUsers.push({ ...userRecord, rawPassword: u.rawPassword });
    console.log(
      `   ✓ [${userRecord.role.toUpperCase()}] ${userRecord.name} (${userRecord.email}) - status: ${userRecord.status}`
    );
  }

  // =========================================================================
  // 2. SEED TELEGRAM USERS (5 Akun [status active])
  // =========================================================================
  console.log("\n📱 [2/4] Seeding Telegram Whitelist Users (5 akun active)...");

  const telegramUsersToSeed = [
    {
      telegram_id: "682910291",
      username: "agus_santoso",
      full_name: "Agus Santoso",
      division: "after_sales",
      is_active: true,
    },
    {
      telegram_id: "719283741",
      username: "budi_pratama",
      full_name: "Budi Pratama",
      division: "after_sales",
      is_active: true,
    },
    {
      telegram_id: "829104829",
      username: "citra_dewi",
      full_name: "Citra Dewi",
      division: "software",
      is_active: true,
    },
    {
      telegram_id: "918273645",
      username: "doni_kurniawan",
      full_name: "Doni Kurniawan",
      division: "software",
      is_active: true,
    },
    {
      telegram_id: "564738291",
      username: "eko_prasetyo",
      full_name: "Eko Prasetyo",
      division: "none",
      is_active: true,
    },
  ];

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
    console.log(
      `   ✓ [@${tgRecord.username}] ${tgRecord.full_name} (ID: ${tgRecord.telegram_id}) - status: active`
    );
  }

  // =========================================================================
  // 3. SEED MASTER DATA (Masing-masing menu isi 5 data)
  // =========================================================================
  console.log("\n📦 [3/4] Seeding Master Data (5 data per menu)...");

  // A. Master Client (5 data)
  console.log("   --- Menu 1: Clients (5 data) ---");
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

  // B. Master Lokasi (5 data)
  console.log("   --- Menu 2: Lokasi (5 data) ---");
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

  // C. Master Komponen (5 data)
  console.log("   --- Menu 3: Komponen (5 data) ---");
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

  // D. Master Failure Code (5 data)
  console.log("   --- Menu 4: Failure Code (5 data) ---");
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

  // E. Master Asset (Unit Load Scanner - 5 data)
  console.log("   --- Menu 5: Unit Load Scanner / Asset (5 data) ---");
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

  // Simpan map asset & failure code untuk seeding tickets
  const assetMap = new Map();
  const allAssets = await prisma.assets.findMany();
  for (const a of allAssets) assetMap.set(a.unit_code, a);

  const failureCodeMap = new Map();
  const allFailures = await prisma.failure_codes.findMany();
  for (const f of allFailures) failureCodeMap.set(f.code, f);

  // Map akun Web (Users)
  const userByEmail = new Map();
  const allUsers = await prisma.users.findMany();
  for (const u of allUsers) userByEmail.set(u.email, u);

  const brunoUser = userByEmail.get("bruno@erad.id");
  const sitiUser = userByEmail.get("siti@erad.id");
  const dimasUser = userByEmail.get("dimas@erad.id");

  // Map akun Telegram (Telegram Users)
  const telegramByUsername = new Map();
  const allTeleUsers = await prisma.telegram_users.findMany();
  for (const tu of allTeleUsers) telegramByUsername.set(tu.username, tu);

  const agusTele = telegramByUsername.get("agus_santoso");
  const budiTele = telegramByUsername.get("budi_pratama");
  const citraTele = telegramByUsername.get("citra_dewi");
  const doniTele = telegramByUsername.get("doni_kurniawan");

  // =========================================================================
  // 4. SEED TICKETS (10 Tiket Beragam: Open dari Tele, History Campur Web & Tele)
  // =========================================================================
  console.log("\n🎫 [4/5] Seeding 10 Tickets (Open via Telegram, History Campur Web & Tele)...");

  const ticketsDefinition = [
    // 1. OPEN (v0) - Dilaporkan via Telegram oleh Agus Santoso
    {
      id: "ERR-20261009-0001",
      unitCode: "WLS-001",
      failureCode: "LDR-01",
      severity: "sedang",
      history: [
        {
          version: 0,
          status: "open",
          severity: "sedang",
          telegramUser: agusTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Laporan otomatis dari bot Telegram teknisi lapangan",
          damageDescription: "Sensor LiDAR mengalami dropout titik point cloud saat dump truck melintas dengan kecepatan 15 km/jam.",
          actionTaken: "Pengecekan fisik konektor kabel M12 dan pembersihan lensa.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 24),
        },
      ],
    },
    // 2. SOLVED (v1) - v0: Telegram (Budi) -> v1: Web Dashboard (Bruno Aftersales Solved langsung via Web)
    {
      id: "ERR-20261009-0002",
      unitCode: "WLS-002",
      failureCode: "PWR-01",
      severity: "tinggi",
      history: [
        {
          version: 0,
          status: "open",
          severity: "tinggi",
          telegramUser: budiTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Laporan anomali daya baterai dari bot Telegram",
          damageDescription: "Tegangan suplai baterai turun drastis ke 20.8V saat IPC dan LiDAR bekerja bersamaan.",
          actionTaken: "Pengukuran resistansi internal cell baterai cadangan.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 20),
        },
        {
          version: 1,
          status: "solved",
          severity: "tinggi",
          user: brunoUser,
          action: "Diselesaikan via Web Dashboard oleh Tim Aftersales: Penggantian modul regulator DC-DC step-down.",
          notes: "Diselesaikan via Web Dashboard oleh Tim Aftersales: Penggantian modul regulator DC-DC step-down.",
          damageDescription: "Tegangan suplai baterai drop.",
          actionTaken: "Penggantian modul regulator DC-DC step-down dan kalibrasi tegangan output stabil 24.0V.",
          rootCause: "Kapasitor filtering pada modul regulator DC-DC mengalami degradasi panas",
          changedAt: new Date(Date.now() - 3600000 * 2),
        },
      ],
    },
    // 3. OPEN (v1) - v0: Telegram (Agus) -> v1: Telegram (Budi Pratama update via bot)
    {
      id: "ERR-20261009-0003",
      unitCode: "WLS-003",
      failureCode: "CAM-01",
      severity: "rendah",
      history: [
        {
          version: 0,
          status: "open",
          severity: "rendah",
          telegramUser: agusTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Hasil capture kamera kanan overexposure pada siang hari terik.",
          damageDescription: "Kamera kanan overexposure saat terkena pantulan sinar matahari langsung.",
          actionTaken: null,
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 18),
        },
        {
          version: 1,
          status: "open",
          severity: "rendah",
          telegramUser: budiTele,
          action: "Update catatan lapangan via Telegram Bot",
          notes: "Pembersihan filter polarisasi lensa dan penyesuaian sudut hood kamera di lokasi.",
          damageDescription: "Kamera kanan overexposure saat siang terik.",
          actionTaken: "Filter polarisasi dipasang ulang dan penyesuaian sudut hood.",
          rootCause: "Pantulan cahaya matahari tanpa filter penahan",
          changedAt: new Date(Date.now() - 3600000 * 10),
        },
      ],
    },
    // 4. OPEN (v1) - v0: Telegram (Budi) -> v1: Web Dashboard (Bruno Aftersales update via Web)
    {
      id: "ERR-20261009-0004",
      unitCode: "WLS-004",
      failureCode: "CMP-01",
      severity: "sedang",
      history: [
        {
          version: 0,
          status: "open",
          severity: "sedang",
          telegramUser: budiTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Suhu prosesor IPC mencapai 88°C dan frekuensi clock tertahan.",
          damageDescription: "Suhu prosesor IPC melebihi 85°C dan menyebabkan delay pemrosesan.",
          actionTaken: null,
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 16),
        },
        {
          version: 1,
          status: "open",
          severity: "sedang",
          user: brunoUser,
          action: "Instruksi pembersihan dan penggantian pasta thermal diinput via Web Dashboard.",
          notes: "Pembersihan sirip heatsink dan penggantian pasta thermal prosesor.",
          damageDescription: "Suhu prosesor IPC panas saat siang hari.",
          actionTaken: "Pembersihan debu blower dan re-paste thermal paste Arctic MX-4.",
          rootCause: "Sirkulasi udara terhambat debu halus tambang",
          changedAt: new Date(Date.now() - 3600000 * 8),
        },
      ],
    },
    // 5. ESCALATED (v2) - v0: Telegram (Agus) -> v1: Web (Bruno eskalasi) -> v2: Web (Siti klaim)
    {
      id: "ERR-20261009-0005",
      unitCode: "WLS-001",
      failureCode: "NET-01",
      severity: "tinggi",
      assignees: [
        { user: sitiUser, isLeader: true },
        { user: dimasUser, isLeader: false },
      ],
      history: [
        {
          version: 0,
          status: "open",
          severity: "tinggi",
          telegramUser: agusTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Koneksi gateway telemetri 4G sering putus saat upload point cloud besar.",
          damageDescription: "Koneksi gateway telemetri 4G sering putus dan packet loss mencapai 22%.",
          actionTaken: "Pengecekan kabel antena eksternal normal.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 28),
        },
        {
          version: 1,
          status: "escalated",
          severity: "tinggi",
          user: brunoUser,
          action: "Dieskalasi ke tim Software via Web Dashboard karena indikasi queue socket crash.",
          notes: "Dieskalasi ke tim Software via Web Dashboard karena indikasi queue socket crash.",
          damageDescription: "Koneksi gateway telemetri sering putus.",
          actionTaken: "Eskalasi ke tim software.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 22),
        },
        {
          version: 2,
          status: "escalated",
          severity: "tinggi",
          user: sitiUser,
          action: "Tiket diklaim oleh Siti Software Leader di Web Dashboard. Memulai analisis crash dump.",
          notes: "Tiket diklaim oleh Siti Software Leader di Web Dashboard. Memulai analisis crash dump.",
          damageDescription: "Koneksi gateway telemetri sering putus.",
          actionTaken: "Ekstraksi log syslog dan profiling queue buffer.",
          rootCause: "Memory leak pada thread uploader telemetri",
          changedAt: new Date(Date.now() - 3600000 * 5),
        },
      ],
    },
    // 6. ESCALATED (v2) - v0: Telegram (Budi) -> v1: Telegram (Agus eskalasi via bot) -> v2: Web (Siti klaim)
    {
      id: "ERR-20261009-0006",
      unitCode: "WLS-002",
      failureCode: "LDR-01",
      severity: "tinggi",
      assignees: [
        { user: sitiUser, isLeader: true },
      ],
      history: [
        {
          version: 0,
          status: "open",
          severity: "tinggi",
          telegramUser: budiTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Stream point cloud berhenti tiba-tiba setelah 2 jam operasi.",
          damageDescription: "Stream point cloud berhenti tiba-tiba setelah 2 jam operasi.",
          actionTaken: "Reboot unit, kendala berulang.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 15),
        },
        {
          version: 1,
          status: "escalated",
          severity: "tinggi",
          telegramUser: agusTele,
          action: "Eskalasi dikirim via Telegram Bot: driver LiDAR segfault di Linux kernel log.",
          notes: "Eskalasi dikirim via Telegram Bot: driver LiDAR segfault di Linux kernel log.",
          damageDescription: "Driver LiDAR segfault.",
          actionTaken: "Eskalasi ke software via bot Telegram.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 10),
        },
        {
          version: 2,
          status: "escalated",
          severity: "tinggi",
          user: sitiUser,
          action: "Tiket diklaim oleh Siti Software Leader di Web Dashboard. Menyiapkan modul kernel v2.1.",
          notes: "Tiket diklaim oleh Siti Software Leader di Web Dashboard. Menyiapkan modul kernel v2.1.",
          damageDescription: "Driver LiDAR segfault.",
          actionTaken: "Penyusunan patch kernel driver.",
          rootCause: "Inkompatibilitas buffer size driver dengan firmware versi 3.8",
          changedAt: new Date(Date.now() - 3600000 * 3),
        },
      ],
    },
    // 7. ESCALATED (v1) - v0: Telegram (Agus) -> v1: Telegram (Budi eskalasi via bot, belum diklaim)
    {
      id: "ERR-20261009-0007",
      unitCode: "WLS-005",
      failureCode: "CAM-01",
      severity: "sedang",
      assignees: [], // Belum diklaim
      history: [
        {
          version: 0,
          status: "open",
          severity: "sedang",
          telegramUser: agusTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Frame rate kamera turun drastis saat kondisi mendung berawan.",
          damageDescription: "Frame rate kamera turun drastis saat kondisi mendung berawan.",
          actionTaken: "Kabel gigabit dan port switch diperiksa dalam kondisi baik.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 12),
        },
        {
          version: 1,
          status: "escalated",
          severity: "sedang",
          telegramUser: budiTele,
          action: "Dieskalasi via Telegram Bot untuk kalibrasi algoritma auto-exposure ISP.",
          notes: "Dieskalasi via Telegram Bot untuk kalibrasi algoritma auto-exposure ISP.",
          damageDescription: "Frame rate kamera drop saat cuaca mendung.",
          actionTaken: "Eskalasi ke tim Software (menunggu klaim).",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 6),
        },
      ],
    },
    // 8. SOLVED (v1) - v0: Telegram (Budi) -> v1: Telegram (Budi selesaikan langsung via bot)
    {
      id: "ERR-20261009-0008",
      unitCode: "WLS-003",
      failureCode: "PWR-01",
      severity: "rendah",
      history: [
        {
          version: 0,
          status: "open",
          severity: "rendah",
          telegramUser: budiTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Konektor power supply 24V longgar akibat getaran lintasan truk.",
          damageDescription: "Konektor power supply 24V longgar akibat getaran lintasan truk.",
          actionTaken: "Pemeriksaan konektor fisik terminal.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 48),
        },
        {
          version: 1,
          status: "solved",
          severity: "rendah",
          telegramUser: budiTele,
          action: "Penyelesaian dikonfirmasi via Telegram Bot: konektor diganti screw-lock dan tegangan normal 24.1V.",
          notes: "Penyelesaian dikonfirmasi via Telegram Bot: konektor diganti screw-lock dan tegangan normal 24.1V.",
          damageDescription: "Konektor kendor.",
          actionTaken: "Penggantian konektor screw-lock dan pengencangan baut braket.",
          rootCause: "Konektor tipe clip plastik longgar karena vibrasi tinggi",
          changedAt: new Date(Date.now() - 3600000 * 36),
        },
      ],
    },
    // 9. SOLVED (v3) - v0: Telegram (Agus) -> v1: Web (Bruno) -> v2: Web (Siti) -> v3: Web (Siti Solved)
    {
      id: "ERR-20261009-0009",
      unitCode: "WLS-004",
      failureCode: "CMP-01",
      severity: "tinggi",
      assignees: [
        { user: sitiUser, isLeader: true },
        { user: dimasUser, isLeader: false },
      ],
      history: [
        {
          version: 0,
          status: "open",
          severity: "tinggi",
          telegramUser: agusTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Layanan kalkulasi volume muatan crash saat memindai truk bertonase panjang.",
          damageDescription: "Layanan kalkulasi volume muatan crash saat memindai truk tronton ekstra panjang.",
          actionTaken: "Restart service manual di site.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 72),
        },
        {
          version: 1,
          status: "escalated",
          severity: "tinggi",
          user: brunoUser,
          action: "Dieskalasi ke tim Software via Web Dashboard karena exception index out of bounds.",
          notes: "Dieskalasi ke tim Software via Web Dashboard karena exception index out of bounds.",
          damageDescription: "Crash algoritma volume.",
          actionTaken: "Eskalasi ke tim software.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 60),
        },
        {
          version: 2,
          status: "escalated",
          severity: "tinggi",
          user: sitiUser,
          action: "Siti Software Leader klaim & unggah hotfix-volume-bounds via Web Dashboard.",
          notes: "Siti Software Leader klaim & unggah hotfix-volume-bounds via Web Dashboard.",
          damageDescription: "Crash algoritma volume.",
          actionTaken: "Debugging dan fix array boundary check.",
          rootCause: "Array boundary check melebihi alokasi memori buffer 3D",
          changedAt: new Date(Date.now() - 3600000 * 40),
        },
        {
          version: 3,
          status: "solved",
          severity: "tinggi",
          user: sitiUser,
          action: "Patch v1.4.2 di-deploy via Web. Pengujian 50 pemindaian truk sukses tanpa crash.",
          notes: "Patch v1.4.2 di-deploy via Web. Pengujian 50 pemindaian truk sukses tanpa crash.",
          damageDescription: "Crash algoritma volume.",
          actionTaken: "Deploy binary patch dan validasi real test.",
          rootCause: "Index out of bounds pada array voxel grid",
          changedAt: new Date(Date.now() - 3600000 * 12),
        },
      ],
    },
    // 10. SOLVED (v2) - v0: Telegram (Budi) -> v1: Web (Bruno eskalasi) -> v2: Telegram (Citra Dewi Software Solved via Bot)
    {
      id: "ERR-20261009-0010",
      unitCode: "WLS-001",
      failureCode: "NET-01",
      severity: "sedang",
      assignees: [
        { telegramUser: citraTele, isLeader: true },
      ],
      history: [
        {
          version: 0,
          status: "open",
          severity: "sedang",
          telegramUser: budiTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Koneksi VPN tunnel putus secara periodik setiap 15 menit.",
          damageDescription: "Koneksi VPN tunnel putus secara periodik setiap 15 menit.",
          actionTaken: "Restart router gateway 4G.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 50),
        },
        {
          version: 1,
          status: "escalated",
          severity: "sedang",
          user: brunoUser,
          action: "Dieskalasi ke tim Software via Web Dashboard untuk tuning VPN keepalive.",
          notes: "Dieskalasi ke tim Software via Web Dashboard untuk tuning VPN keepalive.",
          damageDescription: "Koneksi VPN putus periodik.",
          actionTaken: "Eskalasi ke software.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 30),
        },
        {
          version: 2,
          status: "solved",
          severity: "sedang",
          telegramUser: citraTele,
          action: "Penyelesaian diselesaikan via Telegram Bot: Citra Dewi kirim remote config keepalive 25s dan MTU 1420.",
          notes: "Penyelesaian diselesaikan via Telegram Bot: Citra Dewi kirim remote config keepalive 25s dan MTU 1420.",
          damageDescription: "Koneksi VPN putus periodik.",
          actionTaken: "Update konfigurasi keepalive interval dan persistensi route remote via bot.",
          rootCause: "NAT timeout pada provider seluler menutup koneksi sebelum keepalive",
          changedAt: new Date(Date.now() - 3600000 * 4),
        },
      ],
    },
  ];

  for (const td of ticketsDefinition) {
    const asset = assetMap.get(td.unitCode);
    const failureCode = failureCodeMap.get(td.failureCode);
    if (!asset || !failureCode) continue;

    const latestHistory = td.history[td.history.length - 1];
    const initialHistory = td.history[0];

    // Create / Upsert ticket
    const ticketRecord = await prisma.tickets.upsert({
      where: { id: td.id },
      update: {
        asset_id: asset.id,
        failure_code_id: failureCode.id,
        current_version: latestHistory.version,
        created_at: initialHistory.changedAt,
      },
      create: {
        id: td.id,
        asset_id: asset.id,
        failure_code_id: failureCode.id,
        current_version: latestHistory.version,
        created_at: initialHistory.changedAt,
      },
    });

    // Delete existing history to prevent unique constraint conflict during re-seed
    await prisma.ticket_history.deleteMany({
      where: { ticket_id: td.id },
    });

    // Insert history versions
    for (const h of td.history) {
      await prisma.ticket_history.create({
        data: {
          ticket_id: td.id,
          version: h.version,
          status: h.status,
          severity: h.severity,
          damage_description: h.damageDescription,
          action_taken: h.actionTaken,
          root_cause: h.rootCause,
          notes: h.notes,
          changed_by_user_id: h.user ? h.user.id : null,
          changed_by_telegram_user_id: h.telegramUser ? h.telegramUser.id : null,
          changed_at: h.changedAt,
        },
      });
    }

    // Insert assignees if any
    await prisma.ticket_assignees.deleteMany({
      where: { ticket_id: td.id },
    });

    let leaderAssigneeId = null;
    if (td.assignees && td.assignees.length > 0) {
      for (const a of td.assignees) {
        const assigneeRecord = await prisma.ticket_assignees.create({
          data: {
            ticket_id: td.id,
            user_id: a.user ? a.user.id : null,
            telegram_user_id: a.telegramUser ? a.telegramUser.id : null,
          },
        });
        if (a.isLeader) {
          leaderAssigneeId = assigneeRecord.id;
        }
      }

      if (leaderAssigneeId) {
        await prisma.tickets.update({
          where: { id: td.id },
          data: { leader_assignee_id: leaderAssigneeId },
        });
      }
    }

    console.log(
      `      ✓ Tiket ${ticketRecord.id} [${latestHistory.status.toUpperCase()}] v${latestHistory.version} (${td.unitCode} - ${td.failureCode})`
    );
  }

  // =========================================================================
  // 5. RINGKASAN KREDENSIAL LOGIN
  // =========================================================================
  console.log("\n==================================================");
  console.log("🎉 SEEDING SELESAI DENGAN SUKSES!");
  console.log("==================================================");
  console.log("🔑 KREDENSIAL PENGGUNA UNTUK LOGIN & PENGUJIAN:");
  console.log("--------------------------------------------------");
  console.log(`1. Admin (Active)        : ${seededUsers[0].email} / ${seededUsers[0].rawPassword}`);
  console.log(`2. Coordinator (Invited) : ${seededUsers[1].email} / ${seededUsers[1].rawPassword}`);
  console.log(`3. Coordinator (Invited) : ${seededUsers[2].email} / ${seededUsers[2].rawPassword}`);
  console.log(`4. Viewer (Invited)      : ${seededUsers[3].email} / ${seededUsers[3].rawPassword}`);
  console.log("--------------------------------------------------");
  console.log("ℹ️  User berstatus 'invited' otomatis memicu form paksa ganti password saat login.");
  console.log("==================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Gagal menjalankan seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
