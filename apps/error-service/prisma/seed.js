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
  // 1. SEED TELEGRAM USERS (Whitelist Telegram)
  // =========================================================================
  console.log("📱 [1/4] Seeding Telegram Whitelist Users (6 akun active)...");

  const telegramUsersToSeed = [
    {
      telegram_id: "123456789",
      username: "super_admin",
      full_name: "Super Admin",
      division: "none",
      is_active: true,
    },
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
    {
      telegram_id: "829104829",
      username: "siti_software",
      full_name: "Siti Software 1",
      division: "software",
      is_active: true,
    },
    {
      telegram_id: "918273645",
      username: "surya_software",
      full_name: "Surya Software 2",
      division: "software",
      is_active: true,
    },
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
  // 2. SEED USERS (1 Admin + 4 Coordinator + 1 Viewer, ditautkan ke Whitelist Telegram)
  // =========================================================================
  console.log("\n👤 [2/4] Seeding Users...");

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
      telegramUsername: "super_admin",
    },
    // Coordinator Aftersales (2 Akun)
    {
      email: "bruno@erad.id",
      name: "Bruno Aftersales 1",
      role: "coordinator",
      division: "after_sales",
      status: "invited",
      must_change_password: true,
      rawPassword: "bruno12345",
      telegramUsername: "bruno_aftersales",
    },
    {
      email: "bayu@erad.id",
      name: "Bayu Aftersales 2",
      role: "coordinator",
      division: "after_sales",
      status: "invited",
      must_change_password: true,
      rawPassword: "bayu12345",
      telegramUsername: "bayu_aftersales",
    },
    // Coordinator Software (2 Akun)
    {
      email: "siti@erad.id",
      name: "Siti Software 1",
      role: "coordinator",
      division: "software",
      status: "invited",
      must_change_password: true,
      rawPassword: "siti12345",
      telegramUsername: "siti_software",
    },
    {
      email: "surya@erad.id",
      name: "Surya Software 2",
      role: "coordinator",
      division: "software",
      status: "invited",
      must_change_password: true,
      rawPassword: "surya12345",
      telegramUsername: "surya_software",
    },
    // Viewer (1 Akun, divisi none karena aftersales & software hanya dari role coordinator)
    {
      email: "dimas@erad.id",
      name: "Dimas Viewer",
      role: "viewer",
      division: "none",
      status: "invited",
      must_change_password: true,
      rawPassword: "dimas12345",
      telegramUsername: "dimas_viewer",
    },
  ];

  const seededUsers = [];
  for (const u of usersToSeed) {
    const passwordHash = await bcrypt.hash(u.rawPassword, saltRounds);
    const linkedTelegram = u.telegramUsername ? telegramMap.get(u.telegramUsername) : null;

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
        telegram_user_id: linkedTelegram ? linkedTelegram.id : null,
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
        telegram_user_id: linkedTelegram ? linkedTelegram.id : null,
      },
    });

    seededUsers.push({ ...userRecord, rawPassword: u.rawPassword });
    console.log(
      `   ✓ [${userRecord.role.toUpperCase()}] ${userRecord.name} (${userRecord.email}) - telegram: ${linkedTelegram ? `@${linkedTelegram.username}` : "-"} - status: ${userRecord.status}`
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
  const bayuUser = userByEmail.get("bayu@erad.id");
  const sitiUser = userByEmail.get("siti@erad.id");
  const suryaUser = userByEmail.get("surya@erad.id");
  const dimasUser = userByEmail.get("dimas@erad.id");

  // Map akun Telegram (Telegram Users)
  const telegramByUsername = new Map();
  const allTeleUsers = await prisma.telegram_users.findMany();
  for (const tu of allTeleUsers) telegramByUsername.set(tu.username, tu);

  const brunoTele = telegramByUsername.get("bruno_aftersales");
  const bayuTele = telegramByUsername.get("bayu_aftersales");
  const sitiTele = telegramByUsername.get("siti_software");
  const suryaTele = telegramByUsername.get("surya_software");
  const dimasTele = telegramByUsername.get("dimas_viewer");
  const adminTele = telegramByUsername.get("super_admin");

  // =========================================================================
  // 4. SEED TICKETS (10 Tiket Beragam: Open dari Tele, History Campur Web & Tele)
  // =========================================================================
  console.log("\n🎫 [4/5] Seeding 10 Tickets (Open via Telegram, History Campur Web & Tele)...");

  const ticketsDefinition = [
    // 1. OPEN (v0) - Dilaporkan via Telegram oleh Bruno Aftersales 1
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
          telegramUser: brunoTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Laporan otomatis dari bot Telegram teknisi lapangan",
          damageDescription: "Sensor LiDAR mengalami dropout titik point cloud saat dump truck melintas dengan kecepatan 15 km/jam.",
          actionTaken: "Pengecekan fisik konektor kabel M12 dan pembersihan lensa.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 24),
        },
      ],
    },
    // 2. OPEN (v1) - v0: Telegram (Bayu Aftersales 2) -> v1: Web Dashboard (Bruno Aftersales 1 update catatan penanganan)
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
          telegramUser: bayuTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Laporan anomali daya baterai dari bot Telegram",
          damageDescription: "Tegangan suplai baterai turun drastis ke 20.8V saat IPC dan LiDAR bekerja bersamaan.",
          actionTaken: "Pengukuran resistansi internal cell baterai cadangan.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 20),
        },
        {
          version: 1,
          status: "open",
          severity: "tinggi",
          user: brunoUser,
          action: "Pemeriksaan lanjutan diinput via Web Dashboard oleh Bruno Aftersales 1.",
          notes: "Pemeriksaan lanjutan diinput via Web Dashboard oleh Bruno Aftersales 1: Modul regulator DC-DC cadangan sedang disiapkan untuk penggantian.",
          damageDescription: "Tegangan suplai baterai turun drastis saat beban penuh.",
          actionTaken: "Pengujian bench test unit regulator pengganti dan monitoring tegangan.",
          rootCause: "Degradasi termal kapasitor filtering pada modul regulator DC-DC",
          changedAt: new Date(Date.now() - 3600000 * 6),
        },
      ],
    },
    // 3. OPEN (v0) - Dilaporkan via Telegram oleh Bruno Aftersales 1
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
          telegramUser: brunoTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Hasil capture kamera kanan overexposure pada siang hari terik.",
          damageDescription: "Kamera kanan overexposure saat terkena pantulan sinar matahari langsung.",
          actionTaken: "Pembersihan permukaan kaca pelindung kamera.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 18),
        },
      ],
    },
    // 4. OPEN (v1) - v0: Telegram (Bayu Aftersales 2) -> v1: Web Dashboard (Bayu Aftersales 2 update tindakan)
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
          telegramUser: bayuTele,
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
          user: bayuUser,
          action: "Instruksi pembersihan dan penggantian pasta thermal diinput via Web Dashboard.",
          notes: "Pembersihan sirip heatsink dan persiapan re-paste thermal paste Arctic MX-4 oleh Bayu Aftersales 2.",
          damageDescription: "Suhu prosesor IPC panas saat siang hari.",
          actionTaken: "Pembersihan debu filter dan penggantian thermal paste pada IPC.",
          rootCause: "Sirkulasi udara terhambat akumulasi debu tambang",
          changedAt: new Date(Date.now() - 3600000 * 8),
        },
      ],
    },
    // 5. OPEN (v1) - v0: Web Dashboard (Bruno Aftersales 1 buat tiket) -> v1: Telegram (Bayu Aftersales 2 update observasi)
    {
      id: "ERR-20261009-0005",
      unitCode: "WLS-005",
      failureCode: "NET-01",
      severity: "rendah",
      history: [
        {
          version: 0,
          status: "open",
          severity: "rendah",
          user: brunoUser,
          action: "Tiket dibuka via Web Dashboard oleh Bruno Aftersales 1",
          notes: "Indikasi penurunan throughput transfer data berkala pada unit WLS-005.",
          damageDescription: "Throughput transmisi data telemetri lambat pada saat shift malam.",
          actionTaken: "Pengecekan sinyal operator seluler di site.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 14),
        },
        {
          version: 1,
          status: "open",
          severity: "rendah",
          telegramUser: bayuTele,
          action: "Update catatan observasi lapangan via Telegram Bot",
          notes: "Antena eksternal 4G diperiksa aman, latency ping rata-rata 110ms.",
          damageDescription: "Throughput transmisi data telemetri lambat pada saat shift malam.",
          actionTaken: "Pengujian swap SIM card modem sekunder.",
          rootCause: "Kepadatan bandwidth base station BTS terdekat",
          changedAt: new Date(Date.now() - 3600000 * 5),
        },
      ],
    },
    // 6. ESCALATED (v2) - v0: Tele (Bruno) -> v1: Web (Bruno eskalasi) -> v2: Web (Siti Software 1 Leader update)
    // Assignees: Siti Software 1 (Web & Tele) sebagai Leader, Surya Software 2 (Web & Tele) sebagai Anggota
    {
      id: "ERR-20261009-0006",
      unitCode: "WLS-001",
      failureCode: "NET-01",
      severity: "tinggi",
      assignees: [
        { user: sitiUser, telegramUser: sitiTele, isLeader: true },
        { user: suryaUser, telegramUser: suryaTele, isLeader: false },
      ],
      history: [
        {
          version: 0,
          status: "open",
          severity: "tinggi",
          telegramUser: brunoTele,
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
          action: "Tiket diklaim & ditangani oleh Siti Software 1 di Web Dashboard. Memulai analisis crash dump.",
          notes: "Investigasi oleh tim Software: Ditemukan buffer overflow pada modul telemetri socket saat transfer payload di atas 50MB.",
          damageDescription: "Koneksi gateway telemetri sering putus.",
          actionTaken: "Ekstraksi log syslog, socket profiling, dan pembuatan hotfix queue buffer.",
          rootCause: "Memory leak pada thread uploader telemetri",
          changedAt: new Date(Date.now() - 3600000 * 5),
        },
      ],
    },
    // 7. ESCALATED (v2) - v0: Tele (Bayu) -> v1: Tele (Bruno eskalasi) -> v2: Web (Surya Software 2 update)
    // Assignees: Surya Software 2 (Web & Tele) sebagai Leader
    {
      id: "ERR-20261009-0007",
      unitCode: "WLS-002",
      failureCode: "LDR-01",
      severity: "tinggi",
      assignees: [
        { user: suryaUser, telegramUser: suryaTele, isLeader: true },
      ],
      history: [
        {
          version: 0,
          status: "open",
          severity: "tinggi",
          telegramUser: bayuTele,
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
          telegramUser: brunoTele,
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
          user: suryaUser,
          action: "Ditangani oleh Surya Software 2 via Web Dashboard: Menyiapkan patch modul kernel v2.1.",
          notes: "Update tim Software: Buffer driver tidak kompatibel dengan firmware LiDAR 3.8. Patch sedang dikompilasi.",
          damageDescription: "Driver LiDAR segfault.",
          actionTaken: "Penyusunan dan pengujian patch kernel driver di lab simulasi.",
          rootCause: "Inkompatibilitas buffer size driver dengan firmware versi 3.8",
          changedAt: new Date(Date.now() - 3600000 * 3),
        },
      ],
    },
    // 8. ESCALATED (v2) - v0: Tele (Bruno) -> v1: Web (Bayu Aftersales eskalasi) -> v2: Tele (Siti Software 1 update via Bot)
    // Assignees: Siti Software 1 (Web & Tele)
    {
      id: "ERR-20261009-0008",
      unitCode: "WLS-003",
      failureCode: "CAM-01",
      severity: "sedang",
      assignees: [
        { user: sitiUser, telegramUser: sitiTele, isLeader: true },
      ],
      history: [
        {
          version: 0,
          status: "open",
          severity: "sedang",
          telegramUser: brunoTele,
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
          user: bayuUser,
          action: "Dieskalasi ke tim Software via Web Dashboard untuk tuning ISP exposure.",
          notes: "Dieskalasi ke tim Software via Web Dashboard untuk tuning ISP exposure.",
          damageDescription: "Frame rate kamera drop saat cuaca mendung.",
          actionTaken: "Eskalasi ke tim software.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 6),
        },
        {
          version: 2,
          status: "escalated",
          severity: "sedang",
          telegramUser: sitiTele,
          action: "Update penanganan via Telegram Bot oleh Siti Software 1",
          notes: "Tuning algoritma auto-exposure matrix kamera sedang dijalankan via SSH remote session.",
          damageDescription: "Frame rate kamera drop saat cuaca mendung.",
          actionTaken: "Remote profiling OpenCV pipeline dan update konfigurasi ISP parameter.",
          rootCause: "Algoritma exposure looping tanpa timeout batas atas",
          changedAt: new Date(Date.now() - 3600000 * 2),
        },
      ],
    },
    // 9. ESCALATED (v2) - v0: Tele (Bayu) -> v1: Web (Bruno Aftersales eskalasi) -> v2: Web (Surya Software 2 update)
    // Assignees: Siti Software 1 (Web & Tele), Surya Software 2 (Web & Tele)
    {
      id: "ERR-20261009-0009",
      unitCode: "WLS-004",
      failureCode: "CMP-01",
      severity: "tinggi",
      assignees: [
        { user: sitiUser, telegramUser: sitiTele, isLeader: true },
        { user: suryaUser, telegramUser: suryaTele, isLeader: false },
      ],
      history: [
        {
          version: 0,
          status: "open",
          severity: "tinggi",
          telegramUser: bayuTele,
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
          user: suryaUser,
          action: "Penanganan oleh Surya Software 2: Analisis alokasi voxel grid array.",
          notes: "Penyebab teridentifikasi pada batasan buffer point cloud voxel 3D. Binary patch v1.4.2 sedang dirilis.",
          damageDescription: "Crash algoritma volume saat truk tronton ekstra panjang.",
          actionTaken: "Debugging array boundary check dan memory buffer resizing.",
          rootCause: "Array boundary check melebihi alokasi memori buffer 3D",
          changedAt: new Date(Date.now() - 3600000 * 18),
        },
      ],
    },
    // 10. ESCALATED (v2) - v0: Tele (Bayu) -> v1: Web (Bayu Aftersales eskalasi) -> v2: Tele (Surya Software 2 update via Bot)
    // Assignees: Surya Software 2 (Web & Tele)
    {
      id: "ERR-20261009-0010",
      unitCode: "WLS-005",
      failureCode: "PWR-01",
      severity: "tinggi",
      assignees: [
        { user: suryaUser, telegramUser: suryaTele, isLeader: true },
      ],
      history: [
        {
          version: 0,
          status: "open",
          severity: "tinggi",
          telegramUser: bayuTele,
          action: "Tiket dilaporkan via Telegram Bot",
          notes: "Daemon sensor baterai memicu false alarm overheat secara berulang.",
          damageDescription: "Sensor BMS melaporkan suhu 95°C padahal temperatur fisik sel baterai hanya 32°C.",
          actionTaken: "Pengecekan fisik modul sensor termal normal.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 40),
        },
        {
          version: 1,
          status: "escalated",
          severity: "tinggi",
          user: bayuUser,
          action: "Dieskalasi ke tim Software via Web Dashboard: Indikasi bug parsing CAN-bus daemon.",
          notes: "Dieskalasi ke tim Software via Web Dashboard: Indikasi bug parsing CAN-bus daemon.",
          damageDescription: "False alarm suhu baterai pada daemon.",
          actionTaken: "Eskalasi ke tim software.",
          rootCause: null,
          changedAt: new Date(Date.now() - 3600000 * 25),
        },
        {
          version: 2,
          status: "escalated",
          severity: "tinggi",
          telegramUser: suryaTele,
          action: "Update penanganan via Telegram Bot oleh Surya Software 2",
          notes: "Dikonfirmasi bit masking pada frame CAN ID 0x18F salah offset 2 bit. Patch service bms-daemon sedang diuji.",
          damageDescription: "False alarm suhu baterai pada daemon.",
          actionTaken: "Analisis log frame CAN-bus dan perbaikan bitwise offset parser.",
          rootCause: "Offset parsing bitwise salah pada firmware daemon v1.1",
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
        aftersales_user_id: td.aftersalesUserId || brunoUser.id,
        current_version: latestHistory.version,
        created_at: initialHistory.changedAt,
      },
      create: {
        id: td.id,
        asset_id: asset.id,
        failure_code_id: failureCode.id,
        aftersales_user_id: td.aftersalesUserId || brunoUser.id,
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
        const assignedUserId = a.user?.id || (a.telegramUser?.username?.includes("software") ? sitiUser.id : brunoUser.id);
        const assigneeRecord = await prisma.ticket_assignees.create({
          data: {
            ticket_id: td.id,
            user_id: assignedUserId,
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
  console.log(`1. Admin (Active)                  : ${seededUsers[0].email} / ${seededUsers[0].rawPassword}`);
  console.log(`2. Coordinator Aftersales 1 (Invited) : ${seededUsers[1].email} / ${seededUsers[1].rawPassword}`);
  console.log(`3. Coordinator Aftersales 2 (Invited) : ${seededUsers[2].email} / ${seededUsers[2].rawPassword}`);
  console.log(`4. Coordinator Software 1 (Invited)   : ${seededUsers[3].email} / ${seededUsers[3].rawPassword}`);
  console.log(`5. Coordinator Software 2 (Invited)   : ${seededUsers[4].email} / ${seededUsers[4].rawPassword}`);
  console.log(`6. Viewer (Invited)                   : ${seededUsers[5].email} / ${seededUsers[5].rawPassword}`);
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
