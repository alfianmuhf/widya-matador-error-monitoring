import "dotenv/config";
import prisma from "../src/config/prisma.js";
import { seedData } from "./seed_data.js";

/**
 * ERAD - Ticket Stress Testing Script
 * Generates N tickets (default: 120,000) connected to seed:data master data
 * (Assets, Clients, Locations, Failure Codes, Teams, Aftersales & RnD Users)
 * with versioned history (v0, v1, v2) and team assignments using chunked bulk insertion.
 */

// Konfigurasi
const TOTAL_TICKETS = parseInt(process.env.STRESS_TICKETS || process.argv[2] || "120000", 10);
const CHUNK_SIZE = 2500; // 2,500 tiket per batch (~5,500 baris riwayat per batch)

// Pool template deskripsi masalah
const DAMAGE_TEMPLATES = [
  "Sensor LiDAR mengalami dropout titik point cloud saat unit beroperasi.",
  "Kamera visual odometry kehilangan tracking frame pada kondisi pencahayaan rendah.",
  "Modul BMS melaporkan sel baterai #3 mengalami over-voltage 4.28V.",
  "Koneksi streaming RTSP/WebRTC terputus tiba-tiba ke control room.",
  "IPC mengalami watchdog timeout dan reboot mendadak.",
  "Kompas elektronik & IMU mengalami drift orientasi yaw > 15 derajat.",
  "Inverter DC-DC 24V ke 12V panas berlebih (temperatur > 85°C).",
  "Transmisi paket data telemetri MQTT mengalami latency tinggi (> 5000ms).",
  "Motor stepper lensa auto-focus macet pada posisi infinity.",
  "Konektor kabel sinyal M12 longgar akibat vibrasi kontur jalan tambang.",
  "Pembacaan sensor arus Hall-effect menunjukkan pembacaan nol konstan.",
  "GPS receiver kehilangan lock sinyal RTK saat melintas area pit dinding tinggi.",
];

// Pool template tindakan
const ACTION_TEMPLATES = [
  "Pemeriksaan fisik perkabelan harness, konektor M12, dan catu daya 24V.",
  "Pembersihan lensa optik dan sensor menggunakan cairan isopropil.",
  "Pengujian kalibrasi ulang parameter intrinsik & ekstrinsik pada lab uji.",
  "Pembaruan patch firmware modul dan kalibrasi sensor offline.",
  "Analisis log kernel panic, dmesg, dan crash dump aplikasi.",
  "Pengencangan bracket mounting mekanik dan penggantian vibration damper.",
  "Pemeriksaan voltase terminal baterai dengan multimeter presisi.",
  "Pengujian throughput jaringan dan tuning buffer jitter pipeline.",
  "Penggantian modul sekering fast-acting dan relay proteksi daya.",
];

// Pool template root cause
const ROOT_CAUSE_TEMPLATES = [
  "Vibrasi terus menerus menyebabkan mikro-retak pada solderan pin konektor.",
  "Buffer overflow pada thread uploader saat throughput data melebihi 40 MB/s.",
  "Degradasi termal pada komponen kapasitor elektrolit modul inverter.",
  "Suhu enclosure melebihi batas batas ambang toleransi pendingin pasif.",
  "Fluktuasi tegangan alternator saat mesin dump truck akselerasi mendadak.",
  "Interferensi sinyal frekuensi radio dari antena komunikasi sekitar.",
  "Firmware timeout menangani respon I2C dari modul sensor.",
  "Penumpukan debu tambang halus pada celah kisi ventilasi pendingin.",
];

// Random helpers
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function runStressTest() {
  console.log("==================================================");
  console.log("🚀 MEMULAI STRESS TEST GENERATOR TIKET (RELASIONAL SEED:DATA)");
  console.log(`🎯 Target Total Tiket : ${TOTAL_TICKETS.toLocaleString("id-ID")}`);
  console.log(`📦 Ukuran Batch      : ${CHUNK_SIZE.toLocaleString("id-ID")} tiket/batch`);
  console.log("==================================================\n");

  const startTime = Date.now();

  // 1. Ambil Master Data yang sudah ada di database (hasil dari seed_data.js)
  console.log("🔍 [1/3] Memeriksa ketersediaan Master Data & Pengguna...");
  let [assets, failureCodes, allUsers, allTeleUsers, teams] = await Promise.all([
    prisma.assets.findMany({ select: { id: true, unit_code: true } }),
    prisma.failure_codes.findMany({ select: { id: true, code: true } }),
    prisma.users.findMany({ select: { id: true, name: true, username: true, role: true, division: true } }),
    prisma.telegram_users.findMany({ select: { id: true, username: true, full_name: true } }),
    prisma.teams.findMany({
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, division: true } },
          },
        },
      },
    }),
  ]);

  if (!assets.length || !failureCodes.length || !allUsers.length || !teams.length) {
    console.log("ℹ️  Master data / pengguna / tim belum tersedia di database.");
    console.log("🌱 Otomatis menjalankan 'seed:data' terlebih dahulu...\n");
    await seedData();

    // Ambil ulang data setelah seed
    [assets, failureCodes, allUsers, allTeleUsers, teams] = await Promise.all([
      prisma.assets.findMany({ select: { id: true, unit_code: true } }),
      prisma.failure_codes.findMany({ select: { id: true, code: true } }),
      prisma.users.findMany({ select: { id: true, name: true, username: true, role: true, division: true } }),
      prisma.telegram_users.findMany({ select: { id: true, username: true, full_name: true } }),
      prisma.teams.findMany({
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, username: true, division: true } },
            },
          },
        },
      }),
    ]);
  }

  const aftersalesUsers = allUsers.filter((u) => u.division === "after_sales");
  const rndUsers = allUsers.filter((u) => u.division === "rnd");

  const defaultAftersales = aftersalesUsers.length ? aftersalesUsers : allUsers;
  const defaultRnD = rndUsers.length ? rndUsers : allUsers;

  console.log(`   ✓ Unit/Asset        : ${assets.length} unit`);
  console.log(`   ✓ Failure Codes     : ${failureCodes.length} kode`);
  console.log(`   ✓ Akun Pengguna     : ${allUsers.length} user (${defaultAftersales.length} Aftersales, ${defaultRnD.length} RnD)`);
  console.log(`   ✓ Tim RnD           : ${teams.length} tim (${teams.map((t) => t.name).join(", ")})`);
  console.log(`   ✓ Akun Telegram     : ${allTeleUsers.length} user`);

  // 2. Bersihkan tiket stress test lama (ID diawali 'STRESS-')
  console.log("\n🧹 [2/3] Membersihkan data stress test lama (prefix 'STRESS-')...");
  await prisma.ticket_teams.deleteMany({
    where: { ticket_id: { startsWith: "STRESS-" } },
  });
  await prisma.ticket_history.deleteMany({
    where: { ticket_id: { startsWith: "STRESS-" } },
  });
  const deletedOld = await prisma.tickets.deleteMany({
    where: { id: { startsWith: "STRESS-" } },
  });
  console.log(`   ✓ Dihapus: ${deletedOld.count.toLocaleString("id-ID")} tiket stress lama.`);

  // 3. Generate dan simpan per batch
  console.log(`\n⚡ [3/3] Men-generate & meng-insert ${TOTAL_TICKETS.toLocaleString("id-ID")} tiket ke database...`);

  const totalBatches = Math.ceil(TOTAL_TICKETS / CHUNK_SIZE);
  let totalTicketsCreated = 0;
  let totalHistoriesCreated = 0;
  let totalTeamAssignmentsCreated = 0;

  const severities = ["rendah", "sedang", "tinggi"];
  const nowMs = Date.now();
  const NINETY_DAYS_MS = 90 * 24 * 3600 * 1000;

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStartSeq = batchIdx * CHUNK_SIZE + 1;
    const batchEndSeq = Math.min((batchIdx + 1) * CHUNK_SIZE, TOTAL_TICKETS);
    const countInBatch = batchEndSeq - batchStartSeq + 1;

    const ticketsBatch = [];
    const historiesBatch = [];
    const ticketTeamsBatch = [];

    const batchStartTime = Date.now();

    for (let i = 0; i < countInBatch; i++) {
      const seq = batchStartSeq + i;
      const ticketId = `STRESS-${String(seq).padStart(7, "0")}`;

      const asset = randomChoice(assets);
      const failureCode = randomChoice(failureCodes);
      const aftersalesUser = randomChoice(defaultAftersales);

      // Rentang waktu pembuatan tiket (antara 90 hari lalu s/d sekarang)
      const openTimeMs = nowMs - randomInt(10 * 60 * 1000, NINETY_DAYS_MS);
      const openAt = new Date(openTimeMs);

      // Distribusi status:
      // ~20% OPEN
      // ~45% ESCALATED
      // ~35% SOLVED
      const statusRoll = Math.random();
      let targetStatus = "open";
      if (statusRoll < 0.20) {
        targetStatus = "open";
      } else if (statusRoll < 0.65) {
        targetStatus = "escalated";
      } else {
        targetStatus = "solved";
      }

      let currentVersion = 0;
      let currentTeam = null;
      let escalatedAt = null;
      let solvedAt = null;

      const severity = randomChoice(severities);
      const damage = randomChoice(DAMAGE_TEMPLATES);
      const action = randomChoice(ACTION_TEMPLATES);
      const actorTele = allTeleUsers.length ? randomChoice(allTeleUsers) : null;

      // 1. History v0 (Status: OPEN)
      historiesBatch.push({
        ticket_id: ticketId,
        version: 0,
        status: "open",
        severity,
        team_id: null,
        damage_description: damage,
        action_taken: action,
        root_cause: null,
        notes: `Tiket baru dilaporkan oleh ${aftersalesUser.name} (Aftersales)`,
        changed_by_user_id: aftersalesUser.id,
        changed_by_telegram_user_id: actorTele?.id || null,
        changed_at: openAt,
      });

      if (targetStatus === "escalated" || targetStatus === "solved") {
        currentTeam = randomChoice(teams);
        const teamMemberUsers = (currentTeam.members || []).map((m) => m.user).filter(Boolean);
        const rndActor = teamMemberUsers.length ? randomChoice(teamMemberUsers) : randomChoice(defaultRnD);

        const escalatedMs = openTimeMs + randomInt(1, 12) * 3600 * 1000;
        escalatedAt = new Date(Math.min(escalatedMs, nowMs));

        // 2. History v1 (Status: ESCALATED)
        currentVersion = 1;
        historiesBatch.push({
          ticket_id: ticketId,
          version: 1,
          status: "escalated",
          severity,
          team_id: currentTeam.id,
          damage_description: damage,
          action_taken: `Eskalasi ke tim ${currentTeam.name} untuk analisis dan penanganan lanjutan.`,
          root_cause: null,
          notes: `Dieskalasi ke tim ${currentTeam.name} oleh ${aftersalesUser.name}`,
          changed_by_user_id: rndActor.id,
          changed_by_telegram_user_id: null,
          changed_at: escalatedAt,
        });

        // Penugasan tim di ticket_teams
        ticketTeamsBatch.push({
          ticket_id: ticketId,
          team_id: currentTeam.id,
          assigned_at: escalatedAt,
        });

        if (targetStatus === "solved") {
          const solvedMs = escalatedAt.getTime() + randomInt(2, 72) * 3600 * 1000;
          solvedAt = new Date(Math.min(solvedMs, nowMs));

          // 3. History v2 (Status: SOLVED)
          currentVersion = 2;
          const rootCause = randomChoice(ROOT_CAUSE_TEMPLATES);
          const solvedAction = randomChoice(ACTION_TEMPLATES);

          historiesBatch.push({
            ticket_id: ticketId,
            version: 2,
            status: "solved",
            severity,
            team_id: currentTeam.id,
            damage_description: damage,
            action_taken: solvedAction,
            root_cause: rootCause,
            notes: `Masalah berhasil diselesaikan dan diverifikasi oleh ${rndActor.name} (${currentTeam.name}).`,
            changed_by_user_id: rndActor.id,
            changed_by_telegram_user_id: null,
            changed_at: solvedAt,
          });
        }
      }

      ticketsBatch.push({
        id: ticketId,
        asset_id: asset.id,
        failure_code_id: failureCode.id,
        aftersales_user_id: aftersalesUser.id,
        current_version: currentVersion,
        current_team_id: currentTeam ? currentTeam.id : null,
        open_at: openAt,
        escalated_at: escalatedAt,
        solved_at: solvedAt,
      });
    }

    // Eksekusi insert massal (Foreign Key safe urutan: tickets -> ticket_teams -> ticket_history)
    await prisma.tickets.createMany({
      data: ticketsBatch,
      skipDuplicates: true,
    });

    if (ticketTeamsBatch.length > 0) {
      await prisma.ticket_teams.createMany({
        data: ticketTeamsBatch,
        skipDuplicates: true,
      });
    }

    await prisma.ticket_history.createMany({
      data: historiesBatch,
      skipDuplicates: true,
    });

    totalTicketsCreated += ticketsBatch.length;
    totalHistoriesCreated += historiesBatch.length;
    totalTeamAssignmentsCreated += ticketTeamsBatch.length;

    const batchDurationSec = ((Date.now() - batchStartTime) / 1000).toFixed(2);
    const progressPercent = ((totalTicketsCreated / TOTAL_TICKETS) * 100).toFixed(1);

    console.log(
      `   [Batch ${String(batchIdx + 1).padStart(2, "0")}/${totalBatches}] ` +
      `${totalTicketsCreated.toLocaleString("id-ID").padStart(7)} / ${TOTAL_TICKETS.toLocaleString("id-ID")} tiket ` +
      `(${progressPercent}%) ` +
      `| +${historiesBatch.length.toLocaleString("id-ID")} history | +${ticketTeamsBatch.length.toLocaleString("id-ID")} teams [${batchDurationSec}s]`
    );
  }

  const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("\n==================================================");
  console.log("🎉 STRESS TEST DATA BERHASIL DIBUAT!");
  console.log("==================================================");
  console.log(`📊 Total Tiket Dibuat        : ${totalTicketsCreated.toLocaleString("id-ID")} tiket`);
  console.log(`📑 Total Riwayat Dibuat      : ${totalHistoriesCreated.toLocaleString("id-ID")} history`);
  console.log(`👥 Total Penugasan Tim       : ${totalTeamAssignmentsCreated.toLocaleString("id-ID")} ticket_teams`);
  console.log(`⏱️  Waktu Eksekusi Total      : ${totalDurationSec} detik`);
  console.log(`⚡ Kecepatan Rata-rata       : ${Math.round(totalTicketsCreated / parseFloat(totalDurationSec || 1)).toLocaleString("id-ID")} tiket/detik`);
  console.log("==================================================\n");
}

runStressTest()
  .catch((err) => {
    console.error("\n❌ Gagal menjalankan stress test:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
