import prisma from "../../config/prisma.js";
import { findTicketIdsByCurrentHistory } from "../ticket/ticket.repository.js";

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
    where.created_at = { gte: startDate };
  }
  if (status && status !== "all") {
    const st = status.toLowerCase() === "monitor" ? "escalated" : status.toLowerCase();
    const matchingIds = await findTicketIdsByCurrentHistory({ status: st });
    if (matchingIds) {
      where.id = { in: matchingIds };
    }
  }
  if (componentId && componentId !== "all") {
    where.failure_code = { component_id: componentId };
  }
  if ((clientId && clientId !== "all") || (locationId && locationId !== "all")) {
    where.asset = {};
    if (clientId && clientId !== "all") {
      where.asset.client_id = clientId;
    }
    if (locationId && locationId !== "all") {
      where.asset.location_id = locationId;
    }
  }

  // 2. Fetch Tickets for Current Period
  const tickets = await prisma.tickets.findMany({
    where,
    include: {
      failure_code: {
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          component: {
            select: {
              id: true,
              name: true,
              prefix: true,
            },
          },
        },
      },
      asset: {
        select: {
          unit_code: true,
          client_id: true,
          location_id: true,
        },
      },
      ticket_history: {
        orderBy: { version: "desc" },
        select: {
          version: true,
          status: true,
          changed_at: true,
        },
      },
    },
    orderBy: {
      created_at: "asc",
    },
  });

  // 3. Previous Period for "vs periode lalu" comparison
  let prevTotalTickets = 0;
  if (prevStartDate && prevEndDate) {
    const prevWhere = {
      ...where,
      created_at: {
        gte: prevStartDate,
        lt: prevEndDate,
      },
    };
    prevTotalTickets = await prisma.tickets.count({ where: prevWhere });
  }

  const totalTickets = tickets.length;
  let vsPrevText = "vs periode lalu";
  if (prevTotalTickets > 0 && totalTickets > 0) {
    const diffPct = Math.round(((totalTickets - prevTotalTickets) / prevTotalTickets) * 100);
    vsPrevText = `${diffPct >= 0 ? "+" : ""}${diffPct}% vs periode lalu`;
  }

  // 4. Status Counts (derived from current_version)
  let openTickets = 0;
  let monitorTickets = 0;
  let solvedTickets = 0;

  for (const t of tickets) {
    const currentHistory =
      (t.ticket_history || []).find((h) => h.version === t.current_version) ||
      t.ticket_history?.[0] ||
      {};
    const st = (currentHistory.status || "open").toLowerCase();
    if (st === "open") openTickets++;
    else if (st === "escalated") monitorTickets++;
    else if (st === "solved") solvedTickets++;
  }

  const completedTickets = solvedTickets;
  const completionRate = totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0;

  // 5. MTTR (Mean Time to Resolution)
  let totalResolutionHours = 0;
  let resolvedCount = 0;
  for (const t of tickets) {
    const solvedRow = (t.ticket_history || []).find((h) => h.status === "solved");
    if (solvedRow && t.created_at) {
      const diffHours = (new Date(solvedRow.changed_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60);
      if (diffHours >= 0) {
        totalResolutionHours += diffHours;
        resolvedCount++;
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
  const distinctUnitsInTickets = new Set(tickets.map((t) => t.asset?.unit_code).filter(Boolean));
  const totalAssetsCount = await prisma.assets.count({ where: { is_active: true } });
  const totalOperationalUnits = Math.max(totalAssetsCount, distinctUnitsInTickets.size, 1);
  const affectedUnits = distinctUnitsInTickets.size;

  // 7. Monthly Trend Series
  const monthlyMap = new Map();
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = formatMonthYear(d);
    monthlyMap.set(key, 0);
  }

  for (const t of tickets) {
    const key = formatMonthYear(t.created_at);
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
    { status: "Open", count: openTickets, color: "#ef4444", percent: totalTickets ? Math.round((openTickets / totalTickets) * 100) : 0 },
    { status: "Escalated", count: monitorTickets, color: "#f59e0b", percent: totalTickets ? Math.round((monitorTickets / totalTickets) * 100) : 0 },
  ];

  // 9. Top 5 Failure Codes
  const failureCodeMap = new Map();
  for (const t of tickets) {
    const code = t.failure_code?.code || "UNKNOWN";
    const description = t.failure_code?.description || t.failure_code?.name || "Kerusakan tidak terdefinisi";
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
    const u = t.asset?.unit_code;
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
    prisma.components.findMany({
      where: { is_active: true },
      select: { id: true, name: true, prefix: true },
      orderBy: { name: "asc" },
    }),
    prisma.clients.findMany({
      where: { is_active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.locations.findMany({
      where: { is_active: true },
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
      ],
    },
  };
}
