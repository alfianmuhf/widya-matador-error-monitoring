import prisma from "../src/config/prisma.js";

async function seedSummaryData() {
  const currentCount = await prisma.ticket.count();
  if (currentCount >= 100) {
    console.log(`Database already has ${currentCount} tickets. Skipping extra seeding.`);
    return;
  }

  console.log(`Current ticket count is ${currentCount}. Seeding prototype data to match ~232 tickets...`);

  // Ensure default Client & Location exist
  let client = await prisma.client.findFirst({ where: { isActive: true } });
  if (!client) {
    client = await prisma.client.create({
      data: { name: "PT Berau Coal Mining", isActive: true },
    });
  }

  let location = await prisma.location.findFirst({ where: { isActive: true } });
  if (!location) {
    location = await prisma.location.create({
      data: { name: "Berau Pit 3", isActive: true },
    });
  }

  // Ensure components exist
  const componentDefs = [
    { prefix: "LID", name: "Lidar Scanner Sensor" },
    { prefix: "MPC", name: "Mini PC & OS" },
    { prefix: "CCTV", name: "Optical CCTV Camera" },
    { prefix: "NET", name: "Network Gateway" },
    { prefix: "PSU", name: "Power Supply Unit" },
  ];

  const components = {};
  for (const c of componentDefs) {
    let comp = await prisma.component.findFirst({ where: { prefix: c.prefix } });
    if (!comp) {
      comp = await prisma.component.create({
        data: { prefix: c.prefix, name: c.name, isActive: true },
      });
    }
    components[c.prefix] = comp;
  }

  // Ensure failure codes exist
  const failureDefs = [
    { prefix: "LID", code: "LID-003", description: "data lidar noise" },
    { prefix: "MPC", code: "MPC-002", description: "mini PC nge-lag" },
    { prefix: "LID", code: "LID-001", description: "data lidar baret" },
    { prefix: "MPC", code: "MPC-003", description: "storage penuh" },
    { prefix: "CCTV", code: "CCTV-003", description: "hasil cctv bermasalah" },
    { prefix: "PSU", code: "PSU-001", description: "tegangan drop dibawah 24V" },
    { prefix: "NET", code: "NET-001", description: "koneksi 4G terputus" },
  ];

  const failureCodes = {};
  for (const f of failureDefs) {
    let fc = await prisma.failureCode.findFirst({ where: { code: f.code } });
    if (!fc) {
      fc = await prisma.failureCode.create({
        data: {
          code: f.code,
          description: f.description,
          componentId: components[f.prefix].id,
          isActive: true,
        },
      });
    }
    failureCodes[f.code] = fc;
  }

  // Ensure required units exist (47 total units)
  const targetUnits = [
    "STATIC005", "LSP-033", "LSP-020", "STATIC001", "STATIC017",
    "LSP-001", "LSP-002", "LSP-003", "LSP-004", "STATIC-001",
    "STATIC-002", "STATIC-003", "LSP-005", "LSP-006", "LSP-007",
    "LSP-008", "LSP-009", "LSP-010", "LSP-011", "LSP-012",
    "LSP-013", "LSP-014", "LSP-015", "LSP-016", "LSP-017",
    "LSP-018", "LSP-019", "LSP-021", "LSP-022", "LSP-023",
    "LSP-024", "LSP-025", "LSP-026", "LSP-027", "LSP-028",
    "LSP-029", "LSP-030", "LSP-031", "LSP-032", "LSP-034",
    "LSP-035", "STATIC002", "STATIC003", "STATIC004", "STATIC006",
    "STATIC007", "STATIC008"
  ];

  for (const u of targetUnits) {
    const existing = await prisma.asset.findUnique({ where: { unitCode: u } });
    if (!existing) {
      await prisma.asset.create({
        data: {
          unitCode: u,
          type: u.startsWith("STATIC") ? "STATIC" : "PORTABLE",
          clientId: client.id,
          locationId: location.id,
          status: "ACTIVE",
          isActive: true,
        },
      });
    }
  }

  // Target ticket counts: 232 total
  // Open: 28, Monitor (escalated): 22, Solved: 97, Closed: 85 -> 28 + 22 + 97 + 85 = 232
  // Let's see how many more tickets we need:
  const needed = 232 - currentCount;
  console.log(`Generating ${needed} tickets across March 2026 - September 2026...`);

  // Target distribution per month (approx 232 total):
  // Mar 26: 15, Apr 26: 25, Mei 26: 32, Jun 26: 38, Jul 26: 40, Agu 26: 42, Sep 26: 40
  const months = [
    { year: 2026, month: 2, count: 14 }, // March
    { year: 2026, month: 3, count: 24 }, // April
    { year: 2026, month: 4, count: 32 }, // May
    { year: 2026, month: 5, count: 36 }, // June
    { year: 2026, month: 6, count: 38 }, // July
    { year: 2026, month: 7, count: 35 }, // August
    { year: 2026, month: 8, count: 28 }, // September
  ];

  // Specific top failure codes and units to match the design:
  // Top 5 failure codes: LID-003 (15), MPC-002 (11), LID-001 (10), MPC-003 (9), CCTV-003 (8)
  // Top 5 units: STATIC005 (11), LSP-033 (10), LSP-020 (9), STATIC001 (8), STATIC017 (8)
  const fcList = [
    failureCodes["LID-003"],
    failureCodes["MPC-002"],
    failureCodes["LID-001"],
    failureCodes["MPC-003"],
    failureCodes["CCTV-003"],
    failureCodes["PSU-001"],
    failureCodes["NET-001"],
  ];

  let ticketIndex = currentCount + 1;
  const statusQueue = [];
  // Remaining target statuses to add:
  for (let i = 0; i < 21; i++) statusQueue.push("open"); // will make ~28 open
  for (let i = 0; i < 15; i++) statusQueue.push("escalated"); // will make ~22 escalated
  for (let i = 0; i < 91; i++) statusQueue.push("solved");
  for (let i = 0; i < 80; i++) statusQueue.push("closed");

  for (let mIdx = 0; mIdx < months.length; mIdx++) {
    const mInfo = months[mIdx];
    for (let k = 0; k < mInfo.count; k++) {
      if (ticketIndex > 232) break;

      const day = Math.min(28, 1 + Math.floor(Math.random() * 27));
      const hour = 8 + Math.floor(Math.random() * 10);
      const min = Math.floor(Math.random() * 60);
      const createdAt = new Date(Date.UTC(mInfo.year, mInfo.month, day, hour, min));

      // Bias top units and failure codes for first items
      let uCode = targetUnits[Math.floor(Math.random() * targetUnits.length)];
      if (k % 4 === 0) uCode = "STATIC005";
      else if (k % 5 === 0) uCode = "LSP-033";
      else if (k % 6 === 0) uCode = "LSP-020";
      else if (k % 7 === 0) uCode = "STATIC001";
      else if (k % 8 === 0) uCode = "STATIC017";

      let fc = fcList[Math.floor(Math.random() * fcList.length)];
      if (k % 3 === 0) fc = failureCodes["LID-003"];
      else if (k % 5 === 0) fc = failureCodes["MPC-002"];
      else if (k % 6 === 0) fc = failureCodes["LID-001"];

      const status = statusQueue.pop() || (mIdx < 5 ? "solved" : "open");
      const comp = await prisma.component.findUnique({ where: { id: fc.componentId } });

      const dateStr = `${mInfo.year}${String(mInfo.month + 1).padStart(2, "0")}${String(day).padStart(2, "0")}`;
      const ticketId = `ERR-${dateStr}-${String(ticketIndex).padStart(4, "0")}`;

      let resolvedAt = null;
      let closedAt = null;
      if (status === "solved" || status === "closed") {
        const resolveDays = 1 + Math.random() * 6; // average ~3.5 - 4.0 days
        resolvedAt = new Date(createdAt.getTime() + resolveDays * 24 * 60 * 60 * 1000);
        if (status === "closed") {
          closedAt = new Date(resolvedAt.getTime() + 24 * 60 * 60 * 1000);
        }
      }

      await prisma.ticket.create({
        data: {
          ticketId,
          unitCode: uCode,
          componentId: comp.id,
          failureCodeId: fc.id,
          status,
          damageDescription: fc.description,
          actionTaken: status === "solved" || status === "closed" ? "Perbaikan modul dan kalibrasi sensor telah dilakukan oleh tim teknisi." : null,
          rootCause: status === "solved" || status === "closed" ? "Debu dan vibrasi operasional melebihi batas toleransi." : null,
          severity: "HIGH",
          createdAt,
          updatedAt: resolvedAt || createdAt,
          resolvedAt,
          closedAt,
        },
      });

      ticketIndex++;
    }
  }

  console.log(`✅ Successfully seeded tickets! Total count now in DB.`);
}

seedSummaryData()
  .catch((e) => {
    console.error("Error seeding summary data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
