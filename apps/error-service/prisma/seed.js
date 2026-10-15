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
  console.log("📱 [1/4] Seeding Telegram Whitelist Users (7 akun active)...");

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
      telegram_id: "6981508786",
      username: "iniqiblat",
      full_name: "Queen Qiblattul Qur'aini",
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
    // Coordinator Software (3 Akun)
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
    {
      email: "queenaaham@gmail.com",
      name: "Queen Qiblattul Qur'aini",
      role: "coordinator",
      division: "software",
      status: "invited",
      must_change_password: true,
      rawPassword: "queenaaham12345",
      telegramUsername: "iniqiblat",
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
  const queenUser = userByEmail.get("queenaaham@gmail.com");
  const dimasUser = userByEmail.get("dimas@erad.id");

  // Map akun Telegram (Telegram Users)
  const telegramByUsername = new Map();
  const allTeleUsers = await prisma.telegram_users.findMany();
  for (const tu of allTeleUsers) telegramByUsername.set(tu.username, tu);

  const brunoTele = telegramByUsername.get("bruno_aftersales");
  const bayuTele = telegramByUsername.get("bayu_aftersales");
  const sitiTele = telegramByUsername.get("siti_software");
  const suryaTele = telegramByUsername.get("surya_software");
  const queenTele = telegramByUsername.get("iniqiblat");
  const dimasTele = telegramByUsername.get("dimas_viewer");
  const adminTele = telegramByUsername.get("super_admin");

  // =========================================================================
  // 4. SEED TICKETS (40 Tiket: 15 Solved Escalated, 5 Solved Direct, 10 Escalated, 10 Open)
  // =========================================================================
  console.log("\n🎫 [4/5] Seeding 40 Tickets (15 Solved [Escalated], 5 Solved [Direct Aftersales], 10 Escalated, 10 Open)...");

  // Bersihkan data tiket sebelumnya agar total tiket konsisten tepat 40 tiket
  await prisma.ticket_assignees.deleteMany();
  await prisma.ticket_history.deleteMany();
  await prisma.tickets.deleteMany();

  const nowMs = Date.now();
  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;

  // Format ID tiket: ERR-YYYYMMDD-NNNN
  const makeTicketId = (date, seq) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `ERR-${yyyy}${mm}${dd}-${String(seq).padStart(4, "0")}`;
  };

  // 15 Tiket SOLVED: open_at sebelum hari ini, waktu penyelesaian 1 s.d. 3 hari
  const rawSolved = [
    {
      unitCode: "WLS-001",
      failureCode: "LDR-01",
      severity: "tinggi",
      daysAgo: 28,
      durationDays: 2.5, // 60 jam
      damage: "Sensor LiDAR mengalami dropout titik point cloud saat dump truck melintas 15 km/jam.",
      actionOpen: "Pengecekan fisik konektor kabel M12 dan lensa.",
      actionEscalated: "Eskalasi ke software: modul parser point cloud buffer overflow.",
      actionSolved: "Patch parser kernel v2.4 diterapkan, filtering noise dioptimalkan, dan kalibrasi ulang selesai.",
      rootCause: "Buffer overflow pada thread uploader point cloud saat throughput > 40MB/s",
      leader: sitiUser,
      leaderTele: sitiTele,
      member: suryaUser,
      memberTele: suryaTele,
      escalatedHours: 4,
    },
    {
      unitCode: "WLS-002",
      failureCode: "CAM-01",
      severity: "sedang",
      daysAgo: 26,
      durationDays: 1.2, // ~29 jam
      damage: "Kamera optik mengalami overexposure parah saat terkena pantulan sinar matahari terik.",
      actionOpen: "Pembersihan housing kaca kamera dan filter polarized.",
      actionEscalated: "Eskalasi: auto-exposure matrix looping tanpa boundary check.",
      actionSolved: "Update ISP parameter matrix exposure OpenCV dan pengujian bench 2 jam.",
      rootCause: "Algoritma auto-exposure matrix looping tanpa batas atas ISO",
      leader: suryaUser,
      leaderTele: suryaTele,
      escalatedHours: 3,
    },
    {
      unitCode: "WLS-003",
      failureCode: "PWR-01",
      severity: "tinggi",
      daysAgo: 24,
      durationDays: 2.8, // ~67 jam
      damage: "Tegangan suplai baterai turun drastis ke 20.8V saat IPC dan LiDAR aktif bersamaan.",
      actionOpen: "Bench test resistansi internal cell baterai cadangan.",
      actionEscalated: "Eskalasi: evaluasi modul regulator DC-DC dan filter kapasitor.",
      actionSolved: "Penggantian kapasitor filter DC-DC dan kalibrasi sensor shunt baterai.",
      rootCause: "Degradasi termal kapasitor filtering pada modul regulator DC-DC",
      leader: sitiUser,
      leaderTele: sitiTele,
      escalatedHours: 5,
    },
    {
      unitCode: "WLS-004",
      failureCode: "CMP-01",
      severity: "sedang",
      daysAgo: 22,
      durationDays: 1.5, // 36 jam
      damage: "Suhu prosesor IPC melebihi 85°C dan terjadi throttling frekuensi clock.",
      actionOpen: "Pembersihan filter debu sirip heatsink IPC.",
      actionEscalated: "Eskalasi: proses daemon kalkulasi voxel memakan CPU 100%.",
      actionSolved: "Optimasi multi-threading thread voxelizer dan re-paste thermal paste Arctic MX-4.",
      rootCause: "Thread kalkulasi voxel tidak memiliki sleep/yield interval saat idle",
      leader: suryaUser,
      leaderTele: suryaTele,
      escalatedHours: 4,
    },
    {
      unitCode: "WLS-005",
      failureCode: "NET-01",
      severity: "rendah",
      daysAgo: 20,
      durationDays: 2.1, // ~50 jam
      damage: "Throughput transmisi data telemetri 4G lambat pada shift malam (packet loss 18%).",
      actionOpen: "Pemeriksaan konektor antena eksternal dan sinyal provider.",
      actionEscalated: "Eskalasi: timeout socket uploader MQTT terlalu rendah (5 detik).",
      actionSolved: "Konfigurasi retry backoff dan penambahan buffer socket menjadi 64KB.",
      rootCause: "Socket timeout terlalu agresif saat base station BTS site padat",
      leader: sitiUser,
      leaderTele: sitiTele,
      escalatedHours: 4,
    },
    {
      unitCode: "WLS-001",
      failureCode: "PWR-01",
      severity: "tinggi",
      daysAgo: 18,
      durationDays: 1.8, // ~43 jam
      damage: "Sensor BMS baterai memicu false alarm overheat (terbaca 95°C padahal fisik 32°C).",
      actionOpen: "Inspeksi fisik modul sensor termal normal.",
      actionEscalated: "Eskalasi: indikasi error parsing CAN-bus daemon frame 0x18F.",
      actionSolved: "Perbaikan bitwise offset masking parser frame CAN ID 0x18F.",
      rootCause: "Offset parsing bitwise salah 2 bit pada firmware daemon v1.1",
      leader: suryaUser,
      leaderTele: suryaTele,
      escalatedHours: 3,
    },
    {
      unitCode: "WLS-002",
      failureCode: "LDR-01",
      severity: "sedang",
      daysAgo: 16,
      durationDays: 2.4, // ~58 jam
      damage: "Stream point cloud berhenti tiba-tiba setelah unit beroperasi 4 jam non-stop.",
      actionOpen: "Reboot unit, kendala berulang pada durasi yang sama.",
      actionEscalated: "Eskalasi: memory leak pada buffer frame driver LiDAR Linux.",
      actionSolved: "Re-alokasi memory arena pointer dan release frame memory sesudah inferensi.",
      rootCause: "Memory leak pointer pada pipeline integrasi SDK LiDAR",
      leader: queenUser,
      leaderTele: queenTele,
      member: suryaUser,
      memberTele: suryaTele,
      escalatedHours: 5,
    },
    {
      unitCode: "WLS-003",
      failureCode: "CAM-01",
      severity: "rendah",
      daysAgo: 14,
      durationDays: 1.1, // ~26 jam
      damage: "Frame rate kamera turun drastis ke 8 FPS saat kondisi mendung berawan.",
      actionOpen: "Kabel gigabit dan port switch ethernet diperiksa normal.",
      actionEscalated: "Eskalasi: tuning auto white-balance dan ISP capture exposure.",
      actionSolved: "Update konfigurasi profile ISP parameter low-light tanpa frame dropping.",
      rootCause: "ISP exposure calculation thread memblokir frame capture queue",
      leader: suryaUser,
      leaderTele: suryaTele,
      escalatedHours: 2,
    },
    {
      unitCode: "WLS-004",
      failureCode: "NET-01",
      severity: "tinggi",
      daysAgo: 13,
      durationDays: 2.9, // ~70 jam
      damage: "Koneksi gateway gateway telemetri sering putus saat upload dataset berukuran > 50MB.",
      actionOpen: "Pemeriksaan antena dan penggantian kabel pigtail RF.",
      actionEscalated: "Eskalasi: exception memory leak uploader socket.",
      actionSolved: "Penerapan chunking upload 4MB dan chunk resume capability.",
      rootCause: "Heap memory IPC exhausted saat transfer payload JSON point cloud utuh",
      leader: sitiUser,
      leaderTele: sitiTele,
      escalatedHours: 6,
    },
    {
      unitCode: "WLS-005",
      failureCode: "CMP-01",
      severity: "sedang",
      daysAgo: 11,
      durationDays: 1.6, // ~38 jam
      damage: "Proses sinkronisasi database lokal SQLite di unit mengalami database locked.",
      actionOpen: "Restart service lokal database SQLite.",
      actionEscalated: "Eskalasi: multi-thread contention saat insert paralel sensor log.",
      actionSolved: "Migrasi write mode SQLite ke WAL (Write-Ahead Logging) dengan busy_timeout 5000ms.",
      rootCause: "Default journal mode SQLite mengalami locking contention pada multithreaded daemon",
      leader: suryaUser,
      leaderTele: suryaTele,
      escalatedHours: 4,
    },
    {
      unitCode: "WLS-001",
      failureCode: "CAM-01",
      severity: "rendah",
      daysAgo: 9,
      durationDays: 2.3, // ~55 jam
      damage: "Artefak garis horizontal muncul pada hasil rekaman kamera kiri saat vibrasi tinggi.",
      actionOpen: "Pengencangan baut mounting bracket kamera.",
      actionEscalated: "Eskalasi: desinkronisasi rolling shutter sensor kamera dengan frame clock.",
      actionSolved: "Pengaktifan global shutter mode emulasi dan sync clock genlock internal.",
      rootCause: "Desinkronisasi pixel read-out clock saat terkena vibrasi guncangan jalan tambang",
      leader: queenUser,
      leaderTele: queenTele,
      escalatedHours: 5,
    },
    {
      unitCode: "WLS-002",
      failureCode: "PWR-01",
      severity: "sedang",
      daysAgo: 8,
      durationDays: 1.4, // ~34 jam
      damage: "Sistem proteksi undervoltage mematikan IPC secara tiba-tiba saat start motor scanner.",
      actionOpen: "Pengecekan relay switch daya utama.",
      actionEscalated: "Eskalasi: inrush current motor scanner memicu voltage drop sesaat.",
      actionSolved: "Penambahan modul soft-starter kapasitor bank dan penyesuaian delay undervoltage.",
      rootCause: "Inrush current motor stepper melebihi kapasitas suplai sesaat regulator",
      leader: suryaUser,
      leaderTele: suryaTele,
      escalatedHours: 3,
    },
    {
      unitCode: "WLS-003",
      failureCode: "LDR-01",
      severity: "tinggi",
      daysAgo: 7,
      durationDays: 2.0, // 48 jam
      damage: "Algoritma estimasi volume muatan dump truck menghasilkan deviasi volume > 15%.",
      actionOpen: "Verifikasi dimensi fisik bak dump truck acuan.",
      actionEscalated: "Eskalasi: kalibrasi matriks transformasi ekstrinsik sensor LiDAR ke ground plane.",
      actionSolved: "Kalibrasi ulang rotasi pitch & roll LiDAR dan update matriks rotasi ke database unit.",
      rootCause: "Pergeseran mekanis 1.8 derajat pada mount LiDAR akibat beban dinamis",
      leader: sitiUser,
      leaderTele: sitiTele,
      member: suryaUser,
      memberTele: suryaTele,
      escalatedHours: 4,
    },
    {
      unitCode: "WLS-004",
      failureCode: "CMP-01",
      severity: "sedang",
      daysAgo: 6,
      durationDays: 1.7, // ~41 jam
      damage: "Partisi storage SSD IPC tersisa kurang dari 5% karena log rotasi tidak terkompresi.",
      actionOpen: "Pembersihan manual file dump log sementara.",
      actionEscalated: "Eskalasi: konfigurasi logrotate tidak berjalan otomatis pada cron system.",
      actionSolved: "Perbaikan script cron logrotate dengan retensi 7 hari dan kompresi gzip.",
      rootCause: "File permission script logrotate tidak memiliki execute flag",
      leader: suryaUser,
      leaderTele: suryaTele,
      escalatedHours: 4,
    },
    {
      unitCode: "WLS-005",
      failureCode: "NET-01",
      severity: "tinggi",
      daysAgo: 5,
      durationDays: 2.2, // ~53 jam
      damage: "VPN tunnel WireGuard antara IPC dan server pusat sering terputus (handshake failure).",
      actionOpen: "Restart modem 4G dan service WireGuard.",
      actionEscalated: "Eskalasi: keepalive interval WireGuard terlalu lama sehingga NAT mapping expired.",
      actionSolved: "Pengaturan PersistentKeepalive = 25 pada konfigurasi interface WireGuard.",
      rootCause: "Stateful firewall ISP tambang mendrop inactive UDP session setelah 30 detik",
      leader: sitiUser,
      leaderTele: sitiTele,
      escalatedHours: 5,
    },
  ];

  // 5 Tiket SOLVED LANGSUNG (Open -> Solved, tanpa eskalasi ke Software, ditangani tuntas oleh Aftersales)
  const rawSolvedDirect = [
    {
      unitCode: "WLS-001",
      failureCode: "PWR-01",
      severity: "sedang",
      daysAgo: 21,
      durationDays: 1.3, // ~31 jam
      damage: "Kabel terminal daya aki unit WLS-001 kendor menyebabkan suplai tegangan sesekali drop.",
      actionOpen: "Inspeksi fisik jalur perkabelan power supply dan konektor baterai.",
      actionSolved: "Penggantian klem terminal aki, pengencangan baut torx, dan uji coba running 4 jam normal.",
      rootCause: "Getaran operasional kendaraan tambang melonggarkan klem konektor terminal daya",
    },
    {
      unitCode: "WLS-002",
      failureCode: "CAM-01",
      severity: "rendah",
      daysAgo: 19,
      durationDays: 0.9, // ~22 jam
      damage: "Kaca pelindung luar housing kamera tertutup percikan lumpur tebal jalur hauling.",
      actionOpen: "Pemeriksaan fungsi wiper dan semprotan washer otomatis kamera.",
      actionSolved: "Pembersihan menyeluruh lensa optik, isi ulang tangki wiper fluid, dan uji semprot normal.",
      rootCause: "Cairan reservoir wiper habis saat hujan lebat di area disposal tambang",
    },
    {
      unitCode: "WLS-003",
      failureCode: "NET-01",
      severity: "rendah",
      daysAgo: 17,
      durationDays: 1.6, // ~38 jam
      damage: "Konektor antena omni 4G kendor menyebabkan sinyal telemetri berfluktuasi.",
      actionOpen: "Pengukuran VSWR kabel antena menggunakan antenna analyzer.",
      actionSolved: "Pengencangan konektor N-type antena dan pelapisan ulang vulcanized rubber tape waterproof.",
      rootCause: "Konektor N-type antena mengalami vibrasi berlebih pada tiang mast scanner",
    },
    {
      unitCode: "WLS-004",
      failureCode: "LDR-01",
      severity: "sedang",
      daysAgo: 15,
      durationDays: 2.1, // ~50 jam
      damage: "Bracket pelindung sensor LiDAR sedikit miring akibat tersenggol ranting pohon di jalur hauling.",
      actionOpen: "Inspeksi visual kelurusan posisi mounting bracket scanner.",
      actionSolved: "Realignment posisi bracket dengan waterpass digital dan pengencangan kembali baut pengunci.",
      rootCause: "Benturan mekanis ringan ranting pohon pada jalur hauling tambang",
    },
    {
      unitCode: "WLS-005",
      failureCode: "CMP-01",
      severity: "sedang",
      daysAgo: 12,
      durationDays: 1.4, // ~34 jam
      damage: "Filter sirkulasi udara enclosure IPC tersumbat debu batubara halus meningkatkan suhu box.",
      actionOpen: "Pengecekan suhu internal enclosure dan kondisi fisik saringan udara.",
      actionSolved: "Penggantian spon filter udara baru dan pembersihan kisi-kisi ventilasi kipas exhaust.",
      rootCause: "Akumulasi debu batubara halus melebihi kapasitas filtrasi sebelum jadwal maintenance rutin",
    },
  ];

  // 10 Tiket ESCALATED: dalam penanganan tim Software
  const rawEscalated = [
    {
      unitCode: "WLS-001",
      failureCode: "LDR-01",
      severity: "tinggi",
      daysAgo: 8,
      escalatedHours: 4,
      damage: "Driver LiDAR mengalami segfault saat menerima sinyal trigger dari proximity sensor.",
      actionOpen: "Pengecekan kabel proximity switch.",
      actionEscalated: "Dieskalasi ke tim software: Analisis kernel panic log dan crash dump driver.",
      leader: suryaUser,
      leaderTele: suryaTele,
      member: queenUser,
      memberTele: queenTele,
    },
    {
      unitCode: "WLS-002",
      failureCode: "CAM-01",
      severity: "sedang",
      daysAgo: 7,
      escalatedHours: 3,
      damage: "Kamera kanan kehilangan sinkronisasi timestamp dengan sensor LiDAR (drift > 100ms).",
      actionOpen: "Pengecekan kabel sync PTP IEEE 1588.",
      actionEscalated: "Dieskalasi: Konfigurasi PTP daemon pada IPC clock synchronization.",
      leader: sitiUser,
      leaderTele: sitiTele,
    },
    {
      unitCode: "WLS-003",
      failureCode: "PWR-01",
      severity: "tinggi",
      daysAgo: 6,
      escalatedHours: 5,
      damage: "Inverter daya 24V-to-220V proteksi overtemperature berulang saat siang terik.",
      actionOpen: "Pemeriksaan kipas pendingin modul daya.",
      actionEscalated: "Dieskalasi: Penyesuaian batas suhu thermal shutdown pada firmware controller.",
      leader: suryaUser,
      leaderTele: suryaTele,
    },
    {
      unitCode: "WLS-004",
      failureCode: "CMP-01",
      severity: "sedang",
      daysAgo: 5,
      escalatedHours: 4,
      damage: "Service scanner-core crash saat memproses point cloud truk dengan muatan abnormal tinggi.",
      actionOpen: "Restart service scanner-core via terminal site.",
      actionEscalated: "Dieskalasi: Debugging penanganan exception voxel boundary array pada truk ekstra tinggi.",
      leader: queenUser,
      leaderTele: queenTele,
    },
    {
      unitCode: "WLS-005",
      failureCode: "NET-01",
      severity: "tinggi",
      daysAgo: 4,
      escalatedHours: 3,
      damage: "Modem 4G dual-SIM gagal melakukan failover otomatis ke SIM cadangan saat sinyal drop.",
      actionOpen: "Pengecekan fisik kartu SIM sekunder terpasang baik.",
      actionEscalated: "Dieskalasi: Script pemantauan koneksi network-manager butuh revisi logic ping target.",
      leader: suryaUser,
      leaderTele: suryaTele,
    },
    // 6. UNCLAIMED (Menunggu claim tim software)
    {
      unitCode: "WLS-001",
      failureCode: "PWR-01",
      severity: "sedang",
      daysAgo: 3.5,
      escalatedHours: 4,
      damage: "Indikator state-of-charge (SoC) baterai melompat dari 80% ke 15% secara instan.",
      actionOpen: "Pengukuran voltase fisik baterai 25.2V (seharusnya 80%).",
      actionEscalated: "Dieskalasi ke tim Software: Algoritma coulomb counter BMS butuh kalibrasi ulang kurva pelepasan.",
      leader: null,
      leaderTele: null,
    },
    // 7. UNCLAIMED (Menunggu claim tim software)
    {
      unitCode: "WLS-002",
      failureCode: "LDR-01",
      severity: "tinggi",
      daysAgo: 3,
      escalatedHours: 5,
      damage: "Laser transmitter LiDAR channel 16 mengalami penurunan intensitas pantulan > 40%.",
      actionOpen: "Pembersihan optik scanner dan uji coba outdoor.",
      actionEscalated: "Dieskalasi ke tim Software: Evaluasi degradasi diode laser dengan tim R&D software firmware.",
      leader: null,
      leaderTele: null,
    },
    // 8. UNCLAIMED (Menunggu claim tim software)
    {
      unitCode: "WLS-003",
      failureCode: "CAM-01",
      severity: "sedang",
      daysAgo: 2,
      escalatedHours: 3,
      damage: "Distorsi lensa fisheye kamera bawah melebihi threshold kalibrasi visual odometry.",
      actionOpen: "Pengecekan kelurusan bracket fisik dudukan kamera.",
      actionEscalated: "Dieskalasi ke tim Software: Rekalibrasi parameter matriks intrinsik kamera menggunakan checkerboard.",
      leader: null,
      leaderTele: null,
    },
    // 9. UNCLAIMED (Menunggu claim tim software)
    {
      unitCode: "WLS-004",
      failureCode: "NET-01",
      severity: "tinggi",
      daysAgo: 1.5,
      escalatedHours: 4,
      damage: "Koneksi WebRTC streaming video dari unit scanner ke control room lag parah (> 4 detik).",
      actionOpen: "Pemeriksaan latency jaringan site ke BTS lokal.",
      actionEscalated: "Dieskalasi ke tim Software: Tuning bitrate encoder H.264 dan buffer jitter pada pipeline gstreamer.",
      leader: null,
      leaderTele: null,
    },
    // 10. UNCLAIMED (Menunggu claim tim software)
    {
      unitCode: "WLS-005",
      failureCode: "CMP-01",
      severity: "sedang",
      daysAgo: 1,
      escalatedHours: 2,
      damage: "Time synchronization NTP IPC meleset 1.2 detik terhadap server GPS PPS waktu tambang.",
      actionOpen: "Pengecekan antena GPS eksternal pada atap enclosure.",
      actionEscalated: "Dieskalasi ke tim Software: Penyesuaian konfigurasi chrony daemon untuk prefer GPS PPS source.",
      leader: null,
      leaderTele: null,
    },
  ];

  // 10 Tiket OPEN: baru dilaporkan, dalam penanganan awal tim Aftersales
  const rawOpen = [
    {
      unitCode: "WLS-001",
      failureCode: "LDR-01",
      severity: "sedang",
      daysAgo: 4,
      damage: "Densitas point cloud berkurang saat kondisi kabut tebal di site tambang pagi hari.",
      actionOpen: "Pemeriksaan filter pemanas lensa (defogger heater) aktif atau tidak.",
    },
    {
      unitCode: "WLS-002",
      failureCode: "PWR-01",
      severity: "tinggi",
      daysAgo: 3.5,
      damage: "Alarm suara buzzer modul power aktif menandakan temperatur enclosure > 50°C.",
      actionOpen: "Pengecekan putaran kipas ventilasi intake dan exhaust enclosure unit.",
    },
    {
      unitCode: "WLS-003",
      failureCode: "CAM-01",
      severity: "rendah",
      daysAgo: 3,
      damage: "Bercak debu menempel pada sudut lensa kamera kiri mengurangi akurasi deteksi nomor lambung.",
      actionOpen: "Pembersihan manual menggunakan cairan optik dan kain mikrofiber.",
    },
    {
      unitCode: "WLS-004",
      failureCode: "CMP-01",
      severity: "sedang",
      daysAgo: 2.5,
      damage: "Lampu indikator HDD activity pada IPC menyala konstan merah dan respon I/O melambat.",
      actionOpen: "Pengecekan SMART status SSD via terminal Linux.",
    },
    {
      unitCode: "WLS-005",
      failureCode: "NET-01",
      severity: "rendah",
      daysAgo: 2,
      damage: "Antena 4G menunjukkan indikator sinyal 2 bar dari standar minimum 3 bar.",
      actionOpen: "Pemeriksaan posisi pengarahan antena gain tinggi ke BTS terdekat.",
    },
    {
      unitCode: "WLS-001",
      failureCode: "PWR-01",
      severity: "tinggi",
      daysAgo: 1.5,
      damage: "Solar charge controller tidak mengisi daya saat kondisi cuaca berawan sebagian.",
      actionOpen: "Pengukuran voltase open-circuit solar panel string 1 dan string 2.",
    },
    {
      unitCode: "WLS-002",
      failureCode: "LDR-01",
      severity: "sedang",
      daysAgo: 1,
      damage: "Kabel pelindung conduit M12 sensor LiDAR tergores ranting pohon di jalur hauling.",
      actionOpen: "Inspeksi fisik insulasi kabel dan penggantian corrugated conduit pembungkus.",
    },
    {
      unitCode: "WLS-003",
      failureCode: "NET-01",
      severity: "rendah",
      daysAgo: 0.8,
      damage: "Ping latency ke server telemetry fluktuatif antara 80ms hingga 350ms.",
      actionOpen: "Monitoring paket ICMP ping berkelanjutan dari router site.",
    },
    {
      unitCode: "WLS-004",
      failureCode: "CAM-01",
      severity: "sedang",
      daysAgo: 0.5,
      damage: "Auto-focus kamera pengawas plat nomor truk bergeser sedikit out-of-focus.",
      actionOpen: "Penguncian ring fokus manual pada lensa varifocal 6-22mm.",
    },
    {
      unitCode: "WLS-005",
      failureCode: "CMP-01",
      severity: "sedang",
      daysAgo: 0.2,
      damage: "Sensor accelerometer IPC mendeteksi getaran berlebih di atas 2.5G saat dump truck melaju kencang.",
      actionOpen: "Pemeriksaan karet damper anti-vibrasi pada mounting plate scanner.",
    },
  ];

  // Bangun struktur ticketsDefinition (Total 35)
  const ticketsDefinition = [];
  let ticketSequence = 1;

  // 1. Generate 15 Solved Tickets
  for (const s of rawSolved) {
    const openTime = new Date(nowMs - s.daysAgo * DAY);
    const escalatedTime = new Date(openTime.getTime() + s.escalatedHours * HOUR);
    const solvedTime = new Date(openTime.getTime() + s.durationDays * DAY);
    const id = makeTicketId(openTime, ticketSequence++);
    const aftersalesUser = ticketSequence % 2 === 0 ? brunoUser : bayuUser;
    const aftersalesTele = ticketSequence % 2 === 0 ? brunoTele : bayuTele;

    ticketsDefinition.push({
      id,
      unitCode: s.unitCode,
      failureCode: s.failureCode,
      aftersalesUserId: aftersalesUser.id,
      assignees: [
        { user: s.leader, telegramUser: s.leaderTele, isLeader: true },
        ...(s.member ? [{ user: s.member, telegramUser: s.memberTele, isLeader: false }] : []),
      ],
      history: [
        {
          version: 0,
          status: "open",
          severity: s.severity,
          telegramUser: aftersalesTele,
          notes: s.damage,
          damageDescription: s.damage,
          actionTaken: s.actionOpen,
          rootCause: null,
          changedAt: openTime,
        },
        {
          version: 1,
          status: "escalated",
          severity: s.severity,
          user: aftersalesUser,
          notes: s.actionEscalated,
          damageDescription: s.damage,
          actionTaken: s.actionEscalated,
          rootCause: null,
          changedAt: escalatedTime,
        },
        {
          version: 2,
          status: "solved",
          severity: s.severity,
          user: s.leader,
          notes: s.actionSolved,
          damageDescription: s.damage,
          actionTaken: s.actionSolved,
          rootCause: s.rootCause,
          changedAt: solvedTime,
        },
      ],
    });
  }

  // 1b. Generate 5 Solved Direct Tickets (Open -> Solved, Tanpa Escalated)
  for (const sd of rawSolvedDirect) {
    const openTime = new Date(nowMs - sd.daysAgo * DAY);
    const solvedTime = new Date(openTime.getTime() + sd.durationDays * DAY);
    const id = makeTicketId(openTime, ticketSequence++);
    const aftersalesUser = ticketSequence % 2 === 0 ? brunoUser : bayuUser;
    const aftersalesTele = ticketSequence % 2 === 0 ? brunoTele : bayuTele;

    ticketsDefinition.push({
      id,
      unitCode: sd.unitCode,
      failureCode: sd.failureCode,
      aftersalesUserId: aftersalesUser.id,
      assignees: [], // Tidak ada tim software karena tidak pernah dieskalasi
      history: [
        {
          version: 0,
          status: "open",
          severity: sd.severity,
          telegramUser: aftersalesTele,
          notes: sd.damage,
          damageDescription: sd.damage,
          actionTaken: sd.actionOpen,
          rootCause: null,
          changedAt: openTime,
        },
        {
          version: 1,
          status: "solved",
          severity: sd.severity,
          user: aftersalesUser, // Diselesaikan langsung oleh Aftersales
          notes: sd.actionSolved,
          damageDescription: sd.damage,
          actionTaken: sd.actionSolved,
          rootCause: sd.rootCause,
          changedAt: solvedTime,
        },
      ],
    });
  }

  // 2. Generate 10 Escalated Tickets (5 Claimed, 5 Unclaimed)
  for (const e of rawEscalated) {
    const openTime = new Date(nowMs - e.daysAgo * DAY);
    const escalatedTime = new Date(openTime.getTime() + e.escalatedHours * HOUR);
    const id = makeTicketId(openTime, ticketSequence++);
    const aftersalesUser = ticketSequence % 2 === 0 ? brunoUser : bayuUser;
    const aftersalesTele = ticketSequence % 2 === 0 ? brunoTele : bayuTele;

    const isClaimed = !!e.leader;
    const assignees = isClaimed
      ? [
          { user: e.leader, telegramUser: e.leaderTele, isLeader: true },
          ...(e.member ? [{ user: e.member, telegramUser: e.memberTele, isLeader: false }] : []),
        ]
      : [];

    const history = [
      {
        version: 0,
        status: "open",
        severity: e.severity,
        telegramUser: aftersalesTele,
        notes: e.damage,
        damageDescription: e.damage,
        actionTaken: e.actionOpen,
        rootCause: null,
        changedAt: openTime,
      },
      {
        version: 1,
        status: "escalated",
        severity: e.severity,
        user: aftersalesUser,
        notes: e.actionEscalated,
        damageDescription: e.damage,
        actionTaken: e.actionEscalated,
        rootCause: null,
        changedAt: escalatedTime,
      },
    ];

    if (isClaimed) {
      const updateTime = new Date(escalatedTime.getTime() + 1.5 * HOUR);
      history.push({
        version: 2,
        status: "escalated",
        severity: e.severity,
        user: e.leader,
        notes: `Update investigasi tim software (${e.leader.name}): modul sedang di-trace di lab pengujian.`,
        damageDescription: e.damage,
        actionTaken: `Investigasi lanjutan oleh ${e.leader.name}.`,
        rootCause: null,
        changedAt: updateTime,
      });
    }

    ticketsDefinition.push({
      id,
      unitCode: e.unitCode,
      failureCode: e.failureCode,
      aftersalesUserId: aftersalesUser.id,
      assignees,
      history,
    });
  }

  // 3. Generate 10 Open Tickets
  for (const o of rawOpen) {
    const openTime = new Date(nowMs - o.daysAgo * DAY);
    const id = makeTicketId(openTime, ticketSequence++);
    const aftersalesUser = ticketSequence % 2 === 0 ? brunoUser : bayuUser;
    const aftersalesTele = ticketSequence % 2 === 0 ? brunoTele : bayuTele;

    ticketsDefinition.push({
      id,
      unitCode: o.unitCode,
      failureCode: o.failureCode,
      aftersalesUserId: aftersalesUser.id,
      assignees: [],
      history: [
        {
          version: 0,
          status: "open",
          severity: o.severity,
          telegramUser: aftersalesTele,
          notes: o.damage,
          damageDescription: o.damage,
          actionTaken: o.actionOpen,
          rootCause: null,
          changedAt: openTime,
        },
      ],
    });
  }

  for (const td of ticketsDefinition) {
    const asset = assetMap.get(td.unitCode);
    const failureCode = failureCodeMap.get(td.failureCode);
    if (!asset || !failureCode) continue;

    const latestHistory = td.history[td.history.length - 1];
    const initialHistory = td.history[0];

    // Hitung lifecycle timestamps
    const openAt = initialHistory.changedAt;
    const firstEscalated = td.history.find((h) => h.status === "escalated");
    const escalatedAt = firstEscalated ? firstEscalated.changedAt : null;
    const solvedHistory = td.history.find((h) => h.status === "solved");
    const solvedAt = solvedHistory ? solvedHistory.changedAt : null;

    // Create / Upsert ticket
    const ticketRecord = await prisma.tickets.upsert({
      where: { id: td.id },
      update: {
        asset_id: asset.id,
        failure_code_id: failureCode.id,
        aftersales_user_id: td.aftersalesUserId || brunoUser.id,
        current_version: latestHistory.version,
        open_at: openAt,
        escalated_at: escalatedAt,
        solved_at: solvedAt,
      },
      create: {
        id: td.id,
        asset_id: asset.id,
        failure_code_id: failureCode.id,
        aftersales_user_id: td.aftersalesUserId || brunoUser.id,
        current_version: latestHistory.version,
        open_at: openAt,
        escalated_at: escalatedAt,
        solved_at: solvedAt,
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

    // Unlink leader_assignee_id terlebih dahulu untuk mencegah FK constraint error & mereset tiket unclaimed
    await prisma.tickets.update({
      where: { id: td.id },
      data: { leader_assignee_id: null },
    });

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

    const claimTag =
      latestHistory.status === "escalated"
        ? td.assignees && td.assignees.length > 0
          ? " - CLAIMED"
          : " - UNCLAIMED"
        : "";

    console.log(
      `      ✓ Tiket ${ticketRecord.id} [${latestHistory.status.toUpperCase()}${claimTag}] v${latestHistory.version} (${td.unitCode} - ${td.failureCode})`
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
  console.log(`1. Admin (Active)                     : ${seededUsers[0].email} / ${seededUsers[0].rawPassword}`);
  console.log(`2. Coordinator Aftersales 1 (Invited) : ${seededUsers[1].email} / ${seededUsers[1].rawPassword}`);
  console.log(`3. Coordinator Aftersales 2 (Invited) : ${seededUsers[2].email} / ${seededUsers[2].rawPassword}`);
  console.log(`4. Coordinator Software 1 (Invited)   : ${seededUsers[3].email} / ${seededUsers[3].rawPassword}`);
  console.log(`5. Coordinator Software 2 (Invited)   : ${seededUsers[4].email} / ${seededUsers[4].rawPassword}`);
  console.log(`6. Coordinator Software 3 (Invited)   : ${seededUsers[5].email} / ${seededUsers[5].rawPassword}`);
  console.log(`7. Viewer (Invited)                   : ${seededUsers[6].email} / ${seededUsers[6].rawPassword}`);
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
