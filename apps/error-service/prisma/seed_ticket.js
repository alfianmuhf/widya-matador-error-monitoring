import "dotenv/config";
import prisma from "../src/config/prisma.js";

export async function seedTicket() {
  console.log("==================================================");
  console.log("🎫 MEMULAI SEED TIKET DUMMY (15 TIKET)...");
  console.log("==================================================\n");

  // 1. Ambil Data Prasyarat dari DB
  const [allUsers, allTeams, allAssets, allFailures] = await Promise.all([
    prisma.users.findMany(),
    prisma.teams.findMany(),
    prisma.assets.findMany(),
    prisma.failure_codes.findMany(),
  ]);

  const userMap = new Map();
  for (const u of allUsers) userMap.set(u.username, u);

  const teamMap = new Map();
  for (const t of allTeams) teamMap.set(t.name, t);

  const assetMap = new Map();
  for (const a of allAssets) assetMap.set(a.unit_code, a);

  const failureMap = new Map();
  for (const f of allFailures) failureMap.set(f.code, f);

  // Validasi ketersediaan data master & users
  const brunoUser = userMap.get("bruno");
  const bayuUser = userMap.get("bayu");
  const sitiUser = userMap.get("siti");
  const suryaUser = userMap.get("surya");
  const rndSwTeam = teamMap.get("RnD - Software");
  const rndHwTeam = teamMap.get("RnD - Hardware");

  if (!brunoUser || !bayuUser || !sitiUser || !suryaUser || !rndSwTeam || !rndHwTeam) {
    throw new Error(
      "❌ Data pengguna atau tim belum lengkap di database! Silakan jalankan 'npm run seed:data' terlebih dahulu."
    );
  }

  // 2. Bersihkan Tiket Lama
  console.log("🧹 Membersihkan tiket, riwayat, dan penugasan tim lama...");
  await prisma.ticket_attachments.deleteMany();
  await prisma.ticket_history.deleteMany();
  await prisma.ticket_teams.deleteMany();
  await prisma.tickets.deleteMany();

  const nowMs = Date.now();
  const HOUR = 3600 * 1000;
  const DAY = 24 * HOUR;

  const makeTicketId = (date, seq) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `ERR-${yyyy}${mm}${dd}-${String(seq).padStart(4, "0")}`;
  };

  let sequence = 1;

  // =========================================================================
  // A. 4 TIKET OPEN (2 akun Aftersales masing-masing buat 2 tiket)
  // =========================================================================
  console.log("\n📋 [1/3] Menyiapkan 4 Tiket Status OPEN (2 oleh Bruno, 2 oleh Bayu)...");

  const openTicketsData = [
    // 2 Tiket dibuat oleh Bruno (Aftersales 1)
    {
      author: brunoUser,
      unitCode: "WLS-001",
      failureCode: "LDR-01",
      severity: "sedang",
      daysAgo: 2,
      damage: "Densitas point cloud berkurang drastis saat unit beroperasi pada malam hari berkabut.",
      actionOpen: "Pemeriksaan defogger pemanas optik dan filter pelindung sensor LiDAR.",
    },
    {
      author: brunoUser,
      unitCode: "WLS-002",
      failureCode: "PWR-01",
      severity: "tinggi",
      daysAgo: 1.5,
      damage: "Buzzer modul catu daya menyala intermiten saat voltase dropping ke 21.4V.",
      actionOpen: "Pengecekan terminal konektor baterai utama dan beban arus IPC.",
    },
    // 2 Tiket dibuat oleh Bayu (Aftersales 2)
    {
      author: bayuUser,
      unitCode: "WLS-003",
      failureCode: "CAM-01",
      severity: "rendah",
      daysAgo: 1,
      damage: "Bercak debu menempel pada kaca filter luar kamera visual sisi barat.",
      actionOpen: "Pembersihan manual kaca lensa menggunakan wiper mikrofiber khusus optik.",
    },
    {
      author: bayuUser,
      unitCode: "WLS-004",
      failureCode: "NET-01",
      severity: "sedang",
      daysAgo: 0.5,
      damage: "Indikator sinyal gateway 4G fluktuatif antara 1 dan 2 bar di area loading point.",
      actionOpen: "Pengecekan orientasi fisik antena omni-directional ke menara BTS site.",
    },
  ];

  for (const ot of openTicketsData) {
    const openTime = new Date(nowMs - ot.daysAgo * DAY);
    const ticketId = makeTicketId(openTime, sequence++);
    const asset = assetMap.get(ot.unitCode) || allAssets[0];
    const failure = failureMap.get(ot.failureCode) || allFailures[0];

    const ticket = await prisma.tickets.create({
      data: {
        id: ticketId,
        asset_id: asset.id,
        failure_code_id: failure.id,
        aftersales_user_id: ot.author.id,
        current_version: 0,
        current_team_id: null,
        open_at: openTime,
        escalated_at: null,
        solved_at: null,
      },
    });

    await prisma.ticket_history.create({
      data: {
        ticket_id: ticket.id,
        version: 0,
        status: "open",
        severity: ot.severity,
        team_id: null,
        damage_description: ot.damage,
        action_taken: ot.actionOpen,
        root_cause: null,
        notes: `Tiket baru dilaporkan oleh ${ot.author.name} (Aftersales)`,
        changed_by_user_id: ot.author.id,
        changed_at: openTime,
      },
    });

    console.log(
      `   ✓ [OPEN] ${ticket.id} (${ot.unitCode} - ${ot.failureCode}) | Dibuat oleh: ${ot.author.name}`
    );
  }

  // =========================================================================
  // B. 8 TIKET ESCALATED (4 Software & 4 Hardware, Tanpa Kolaborator)
  // =========================================================================
  console.log("\n⚡ [2/3] Menyiapkan 8 Tiket Status ESCALATED (4 RnD Software, 4 RnD Hardware - Tanpa Kolaborator)...");

  const escalatedTicketsData = [
    // --- 4 Tiket untuk Tim RnD - Software ---
    {
      team: rndSwTeam,
      author: brunoUser,
      unitCode: "WLS-001",
      failureCode: "LDR-01",
      severity: "tinggi",
      daysAgo: 6,
      escalatedHours: 3,
      damage: "Parser stream data point cloud mengalami socket connection reset berulang.",
      actionOpen: "Restart service daemon lidar_streamer di terminal Linux IPC.",
      actionEscalated: "Eskalasi ke RnD Software: bug thread buffer overrun pada socket reader.",
    },
    {
      team: rndSwTeam,
      author: bayuUser,
      unitCode: "WLS-002",
      failureCode: "CAM-01",
      severity: "sedang",
      daysAgo: 5,
      escalatedHours: 4,
      damage: "Pipeline OpenCV visual frame segmentation memory leak mencapai 92% RAM.",
      actionOpen: "Restart process segmentation_service.",
      actionEscalated: "Eskalasi ke RnD Software: analisa heap dump python process memory leak.",
    },
    {
      team: rndSwTeam,
      author: brunoUser,
      unitCode: "WLS-003",
      failureCode: "CMP-01",
      severity: "tinggi",
      daysAgo: 4,
      escalatedHours: 2,
      damage: "Daemon sinkronisasi database lokal SQLite corupt setelah shutdown mendadak.",
      actionOpen: "Cek integritas file database SQLite lokal.",
      actionEscalated: "Eskalasi ke RnD Software: pembuatan script recovery journal WAL DB.",
    },
    {
      team: rndSwTeam,
      author: bayuUser,
      unitCode: "WLS-004",
      failureCode: "NET-01",
      severity: "sedang",
      daysAgo: 3,
      escalatedHours: 5,
      damage: "Protokol MQTT telemetry publisher gagal reconnect saat handshake TLS timeout.",
      actionOpen: "Pemeriksaan sertifikat client MQTT dan ping gateway.",
      actionEscalated: "Eskalasi ke RnD Software: penyesuaian backoff interval reconnect TLS.",
    },

    // --- 4 Tiket untuk Tim RnD - Hardware ---
    {
      team: rndHwTeam,
      author: brunoUser,
      unitCode: "WLS-005",
      failureCode: "PWR-01",
      severity: "tinggi",
      daysAgo: 6,
      escalatedHours: 4,
      damage: "Modul BMS lithium pack melapor cell unbalance melebihi 250mV.",
      actionOpen: "Pengecekan temperatur pack baterai dan voltage per cell.",
      actionEscalated: "Eskalasi ke RnD Hardware: uji balancing resistance dan MOSFET switching.",
    },
    {
      team: rndHwTeam,
      author: bayuUser,
      unitCode: "WLS-001",
      failureCode: "CMP-01",
      severity: "sedang",
      daysAgo: 5,
      escalatedHours: 3,
      damage: "Kipas pendingin PWM blower pada IPC berputar lambat dan terdeteksi tachometer stall.",
      actionOpen: "Pembersihan debu sirip heatsink dan grill ventilasi.",
      actionEscalated: "Eskalasi ke RnD Hardware: evaluasi bearing kipas blower 12V DC.",
    },
    {
      team: rndHwTeam,
      author: brunoUser,
      unitCode: "WLS-002",
      failureCode: "LDR-01",
      severity: "tinggi",
      daysAgo: 4,
      escalatedHours: 5,
      damage: "Kabel feed power 24V sensor LiDAR mengalami voltage drop saat modul laser firing.",
      actionOpen: "Ukur resistansi jalur konektor pin M12.",
      actionEscalated: "Eskalasi ke RnD Hardware: cek trace PCB regulator power distribution board.",
    },
    {
      team: rndHwTeam,
      author: bayuUser,
      unitCode: "WLS-003",
      failureCode: "CAM-01",
      severity: "sedang",
      daysAgo: 3,
      escalatedHours: 2,
      damage: "Bracket gimbal kamera visual bergetar hebat saat melewati rumble strip hauling.",
      actionOpen: "Pengencangan baut mounting bracket M8.",
      actionEscalated: "Eskalasi ke RnD Hardware: redesain damper karet peredam getaran 30 Shore A.",
    },
  ];

  for (const et of escalatedTicketsData) {
    const openTime = new Date(nowMs - et.daysAgo * DAY);
    const escalatedTime = new Date(openTime.getTime() + et.escalatedHours * HOUR);
    const ticketId = makeTicketId(openTime, sequence++);
    const asset = assetMap.get(et.unitCode) || allAssets[0];
    const failure = failureMap.get(et.failureCode) || allFailures[0];

    const ticket = await prisma.tickets.create({
      data: {
        id: ticketId,
        asset_id: asset.id,
        failure_code_id: failure.id,
        aftersales_user_id: et.author.id,
        current_version: 1,
        current_team_id: et.team.id,
        open_at: openTime,
        escalated_at: escalatedTime,
        solved_at: null,
      },
    });

    // Masukkan hanya 1 tim penanggung jawab utama ke ticket_teams (tanpa kolaborator)
    await prisma.ticket_teams.create({
      data: {
        ticket_id: ticket.id,
        team_id: et.team.id,
        assigned_at: escalatedTime,
      },
    });

    // History v0 (Open)
    await prisma.ticket_history.create({
      data: {
        ticket_id: ticket.id,
        version: 0,
        status: "open",
        severity: et.severity,
        team_id: null,
        damage_description: et.damage,
        action_taken: et.actionOpen,
        root_cause: null,
        notes: `Dilaporkan oleh ${et.author.name} (Aftersales)`,
        changed_by_user_id: et.author.id,
        changed_at: openTime,
      },
    });

    // History v1 (Escalated)
    await prisma.ticket_history.create({
      data: {
        ticket_id: ticket.id,
        version: 1,
        status: "escalated",
        severity: et.severity,
        team_id: et.team.id,
        damage_description: et.damage,
        action_taken: et.actionEscalated,
        root_cause: null,
        notes: `Dieskalasi ke tim ${et.team.name} oleh ${et.author.name}`,
        changed_by_user_id: et.author.id,
        changed_at: escalatedTime,
      },
    });

    console.log(
      `   ✓ [ESCALATED] ${ticket.id} (${et.unitCode} - ${et.failureCode}) | Tim: ${et.team.name} (Tanpa Kolaborator)`
    );
  }

  // =========================================================================
  // C. 3 TIKET SOLVED
  // =========================================================================
  console.log("\n✅ [3/3] Menyiapkan 3 Tiket Status SOLVED (Selesai Penanganan)...");

  const solvedTicketsData = [
    // 1. Solved oleh Tim RnD - Software
    {
      team: rndSwTeam,
      author: brunoUser,
      leader: sitiUser,
      unitCode: "WLS-004",
      failureCode: "LDR-01",
      severity: "tinggi",
      daysAgo: 14,
      escalatedHours: 3,
      solveHours: 36,
      damage: "Penyimpangan koordinat kalibrasi titik referensi ground plane sensor LiDAR.",
      actionOpen: "Cek leveling fisik tripod mounting dan target retroreflektif.",
      actionEscalated: "Eskalasi ke RnD Software untuk rekalibrasi matriks ekstrinsik 6-DOF.",
      actionSolved: "Algoritma kalibrasi otomatis ICP v3.2 diterapkan, error RMS turun ke 0.012m.",
      rootCause: "Parameter transform matriks ekstrinsik lama mengalami drift akibat vibrasi unit bergerak.",
    },
    // 2. Solved oleh Tim RnD - Software
    {
      team: rndSwTeam,
      author: bayuUser,
      leader: sitiUser,
      unitCode: "WLS-005",
      failureCode: "CMP-01",
      severity: "sedang",
      daysAgo: 10,
      escalatedHours: 4,
      solveHours: 24,
      damage: "IPC mengalami boot loop setelah kegagalan partisi root read-only.",
      actionOpen: "Flash ulang firmware base image dari USB recovery installer.",
      actionEscalated: "Eskalasi ke RnD Software untuk audit integritas script systemd boot sequence.",
      actionSolved: "Pembaruan script watchdog systemd dan integrasi recovery fallback partition.",
      rootCause: "File system journal corrupt saat unit dimatikan mendadak dari emergency stop.",
    },
    // 3. Solved oleh Tim RnD - Hardware
    {
      team: rndHwTeam,
      author: brunoUser,
      leader: suryaUser,
      unitCode: "WLS-001",
      failureCode: "PWR-01",
      severity: "tinggi",
      daysAgo: 8,
      escalatedHours: 2,
      solveHours: 28,
      damage: "DC-DC buck converter 12V output berisolasi drop saat relay beban aux menyala.",
      actionOpen: "Uji isolasi beban relay menggunakan multimeter digital.",
      actionEscalated: "Eskalasi ke RnD Hardware untuk investigasi modul switching converter.",
      actionSolved: "Penggantian modul switching regulator Traco Power dan pengujian burn-in test 8 jam.",
      rootCause: "Degradasi kapasitor output filter DC-DC regulator setelah beroperasi 4500 jam.",
    },
  ];

  for (const st of solvedTicketsData) {
    const openTime = new Date(nowMs - st.daysAgo * DAY);
    const escalatedTime = new Date(openTime.getTime() + st.escalatedHours * HOUR);
    const solvedTime = new Date(escalatedTime.getTime() + st.solveHours * HOUR);
    const ticketId = makeTicketId(openTime, sequence++);
    const asset = assetMap.get(st.unitCode) || allAssets[0];
    const failure = failureMap.get(st.failureCode) || allFailures[0];

    const ticket = await prisma.tickets.create({
      data: {
        id: ticketId,
        asset_id: asset.id,
        failure_code_id: failure.id,
        aftersales_user_id: st.author.id,
        current_version: 2,
        current_team_id: st.team.id,
        open_at: openTime,
        escalated_at: escalatedTime,
        solved_at: solvedTime,
      },
    });

    await prisma.ticket_teams.create({
      data: {
        ticket_id: ticket.id,
        team_id: st.team.id,
        assigned_at: escalatedTime,
      },
    });

    // History v0 (Open)
    await prisma.ticket_history.create({
      data: {
        ticket_id: ticket.id,
        version: 0,
        status: "open",
        severity: st.severity,
        team_id: null,
        damage_description: st.damage,
        action_taken: st.actionOpen,
        root_cause: null,
        notes: `Dilaporkan oleh ${st.author.name} (Aftersales)`,
        changed_by_user_id: st.author.id,
        changed_at: openTime,
      },
    });

    // History v1 (Escalated)
    await prisma.ticket_history.create({
      data: {
        ticket_id: ticket.id,
        version: 1,
        status: "escalated",
        severity: st.severity,
        team_id: st.team.id,
        damage_description: st.damage,
        action_taken: st.actionEscalated,
        root_cause: null,
        notes: `Dieskalasi ke tim ${st.team.name} oleh ${st.author.name}`,
        changed_by_user_id: st.author.id,
        changed_at: escalatedTime,
      },
    });

    // History v2 (Solved)
    await prisma.ticket_history.create({
      data: {
        ticket_id: ticket.id,
        version: 2,
        status: "solved",
        severity: st.severity,
        team_id: st.team.id,
        damage_description: st.damage,
        action_taken: st.actionSolved,
        root_cause: st.rootCause,
        notes: `Diselesaikan oleh ${st.leader.name} (${st.team.name})`,
        changed_by_user_id: st.leader.id,
        changed_at: solvedTime,
      },
    });

    console.log(
      `   ✓ [SOLVED] ${ticket.id} (${st.unitCode} - ${st.failureCode}) | Diselesaikan oleh: ${st.leader.name} (${st.team.name})`
    );
  }

  console.log("\n==================================================");
  console.log("🎉 SEED TIKET SELESAI DENGAN SUKSES!");
  console.log("==================================================");
  console.log("📊 Rekapitulasi 15 Tiket Dummy:");
  console.log("   - Status OPEN      : 4 tiket (2 dibuat Bruno, 2 dibuat Bayu)");
  console.log("   - Status ESCALATED : 8 tiket (4 RnD Software, 4 RnD Hardware - tanpa kolaborator)");
  console.log("   - Status SOLVED    : 3 tiket (2 RnD Software, 1 RnD Hardware)");
  console.log("==================================================\n");
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("prisma/seed_ticket.js")) {
  seedTicket()
    .catch((err) => {
      console.error("❌ Gagal seed tiket:", err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
