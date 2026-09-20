import prisma from "../../config/prisma.js";

const MONTH_NAMES_ID = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

/**
 * Helper to format date into "Bulan YY", e.g. "Mar 26"
 */
function formatMonthYear(date) {
  const d = new Date(date);
  const m = MONTH_NAMES_ID[d.getMonth()];
  const y = String(d.getFullYear()).slice(-2);
  return `${m} ${y}`;
}

/**
 * Service to aggregate & calculate summary metrics
 */
export async function getSummaryData(query = {}) {
  const {
    timeRange = "6m",
    componentId,
    clientId,
    locationId,
    status,
  } = query;

  const now = new Date();
  let startDate = null;
  let prevStartDate = null;
  let prevEndDate = null;
  let monthCount = 6;

  if (timeRange === "30d") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    prevStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    prevEndDate = startDate;
    monthCount = 2;
  } else if (timeRange === "90d") {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    prevStartDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    prevEndDate = startDate;
    monthCount = 3;
  } else if (timeRange === "6m") {
    startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    prevStartDate = new Date(now.getTime() - 360 * 24 * 60 * 60 * 1000);
    prevEndDate = startDate;
    monthCount = 7;
  } else {
    // "all"
    startDate = null;
    prevStartDate = null;
    prevEndDate = null;
    monthCount = 12;
  }

  // 1. Build Where Clause
  const where = {};
  if (startDate) {
    where.createdAt = { gte: startDate };
  }
  if (status && status !== "all") {
    const st = status.toLowerCase();
    where.status = st === "monitor" ? "escalated" : st;
  }
  if (componentId && componentId !== "all") {
    where.componentId = componentId;
  }
  if ((clientId && clientId !== "all") || (locationId && locationId !== "all")) {
    where.asset = {};
    if (clientId && clientId !== "all") {
      where.asset.clientId = clientId;
    }
    if (locationId && locationId !== "all") {
      where.asset.locationId = locationId;
    }
  }

  // 2. Fetch Tickets for Current Period
  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      failureCode: {
        select: {
          id: true,
          code: true,
          description: true,
        },
      },
      component: {
        select: {
          id: true,
          name: true,
          prefix: true,
        },
      },
      asset: {
        select: {
          unitCode: true,
          clientId: true,
          locationId: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // 3. Previous Period for "vs periode lalu" comparison
  let prevTotalTickets = 0;
  if (prevStartDate && prevEndDate) {
    const prevWhere = {
      ...where,
      createdAt: {
        gte: prevStartDate,
        lt: prevEndDate,
      },
    };
    prevTotalTickets = await prisma.ticket.count({ where: prevWhere });
  }

  const totalTickets = tickets.length;
  let vsPrevText = "vs periode lalu";
  if (prevTotalTickets > 0 && totalTickets > 0) {
    const diffPct = Math.round(((totalTickets - prevTotalTickets) / prevTotalTickets) * 100);
    vsPrevText = `${diffPct >= 0 ? "+" : ""}${diffPct}% vs periode lalu`;
  }

  // 4. Status Counts
  const openTickets = tickets.filter((t) => t.status === "open").length;
  const monitorTickets = tickets.filter((t) => t.status === "escalated").length;
  const solvedTickets = tickets.filter((t) => t.status === "solved").length;
  const closedTickets = tickets.filter((t) => t.status === "closed").length;
  const completedTickets = solvedTickets + closedTickets;
  const completionRate = totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0;

  // 5. MTTR (Mean Time to Resolution)
  let totalResolutionHours = 0;
  let resolvedCount = 0;
  for (const t of tickets) {
    if (t.status === "solved" || t.status === "closed") {
      const end = t.resolvedAt || t.closedAt || t.updatedAt;
      if (end && t.createdAt) {
        const diffHours = (new Date(end).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
        if (diffHours >= 0) {
          totalResolutionHours += diffHours;
          resolvedCount++;
        }
      }
    }
  }

  let mttrDays = 0;
  if (resolvedCount > 0) {
    mttrDays = Number((totalResolutionHours / resolvedCount / 24).toFixed(1));
  } else if (completedTickets > 0) {
    mttrDays = 4.0;
  }

  // 6. Unit Terdampak
  const distinctUnitsInTickets = new Set(tickets.map((t) => t.unitCode).filter(Boolean));
  const totalAssetsCount = await prisma.asset.count({ where: { isActive: true } });
  const totalOperationalUnits = Math.max(totalAssetsCount, distinctUnitsInTickets.size, 1);
  const affectedUnits = distinctUnitsInTickets.size;

  // 7. Monthly Trend Series
  // Generate month slots ending at current month
  const monthlyMap = new Map();
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = formatMonthYear(d);
    monthlyMap.set(key, 0);
  }

  for (const t of tickets) {
    const key = formatMonthYear(t.createdAt);
    if (monthlyMap.has(key)) {
      monthlyMap.set(key, monthlyMap.get(key) + 1);
    } else if (timeRange === "all") {
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
    }
  }

  const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, count]) => ({
    month,
    count,
  }));

  // 8. Status Distribution Data
  const statusDistribution = [
    { status: "Solved", count: solvedTickets, color: "#10b981", percent: totalTickets ? Math.round((solvedTickets / totalTickets) * 100) : 0 },
    { status: "Closed", count: closedTickets, color: "#64748b", percent: totalTickets ? Math.round((closedTickets / totalTickets) * 100) : 0 },
    { status: "Open", count: openTickets, color: "#ef4444", percent: totalTickets ? Math.round((openTickets / totalTickets) * 100) : 0 },
    { status: "Escalated", count: monitorTickets, color: "#f59e0b", percent: totalTickets ? Math.round((monitorTickets / totalTickets) * 100) : 0 },
  ];

  // 9. Top 5 Failure Codes
  const failureCodeMap = new Map();
  for (const t of tickets) {
    const code = t.failureCode?.code || "UNKNOWN";
    const description = t.failureCode?.description || "Kerusakan tidak terdefinisi";
    if (!failureCodeMap.has(code)) {
      failureCodeMap.set(code, { code, description, count: 0 });
    }
    failureCodeMap.get(code).count++;
  }

  const topFailureCodes = Array.from(failureCodeMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // 10. Top 5 Problematic Units
  const unitMap = new Map();
  for (const t of tickets) {
    const u = t.unitCode;
    if (u) {
      unitMap.set(u, (unitMap.get(u) || 0) + 1);
    }
  }

  const sortedUnits = Array.from(unitMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxUnitCount = sortedUnits.length > 0 ? sortedUnits[0][1] : 1;
  const topUnits = sortedUnits.map(([unitCode, count]) => ({
    unitCode,
    count,
    percentage: Math.round((count / maxUnitCount) * 100),
  }));

  // 11. Dropdown Filter Options
  const [components, clients, locations] = await Promise.all([
    prisma.component.findMany({
      where: { isActive: true },
      select: { id: true, name: true, prefix: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.location.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    kpis: {
      totalTickets,
      vsPrevPeriodText: vsPrevText,
      openTickets,
      monitorTickets,
      completedTickets,
      completionRate,
      mttrDays: mttrDays.toFixed(1),
      affectedUnits,
      totalUnits: totalOperationalUnits,
    },
    charts: {
      monthlyTrend,
      statusDistribution,
    },
    rankings: {
      topFailureCodes,
      topUnits,
    },
    filterOptions: {
      components: components.map((c) => ({ id: c.id, label: `${c.prefix ? c.prefix + " - " : ""}${c.name}` })),
      clients: clients.map((c) => ({ id: c.id, label: c.name })),
      locations: locations.map((l) => ({ id: l.id, label: l.name })),
      statuses: [
        { value: "all", label: "Semua status" },
        { value: "open", label: "Open" },
        { value: "escalated", label: "Escalated" },
        { value: "solved", label: "Solved" },
        { value: "closed", label: "Closed" },
      ],
    },
  };
}
