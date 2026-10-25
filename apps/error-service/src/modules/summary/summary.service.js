import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma.js";
import { getCache, setCache } from "../../config/redis.js";

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
 * Build dynamic Prisma.sql conditions for SQL aggregation queries
 */
function buildConditions({ startDate, endDate, componentId, clientId, locationId, status }) {
  const conditions = [Prisma.sql`1=1`];

  if (startDate) {
    conditions.push(Prisma.sql`t.open_at >= ${startDate}`);
  }
  if (endDate) {
    conditions.push(Prisma.sql`t.open_at < ${endDate}`);
  }
  if (status && status !== "all") {
    const st = status.toLowerCase() === "monitor" ? "escalated" : status.toLowerCase();
    conditions.push(Prisma.sql`th.status = ${st}::ticket_status`);
  }
  if (componentId && componentId !== "all") {
    conditions.push(Prisma.sql`fc.component_id = ${componentId}::uuid`);
  }
  if (clientId && clientId !== "all") {
    conditions.push(Prisma.sql`a.client_id = ${clientId}::uuid`);
  }
  if (locationId && locationId !== "all") {
    conditions.push(Prisma.sql`a.location_id = ${locationId}::uuid`);
  }

  return Prisma.join(conditions, " AND ");
}

/**
 * Service to aggregate & calculate summary metrics using PostgreSQL aggregation & Redis caching
 */
export async function getSummaryData(query = {}) {
  const {
    timeRange = "6m",
    componentId,
    clientId,
    locationId,
    status,
  } = query;

  // 1. Check Redis Cache
  const cacheKey = `summary:${timeRange}:${componentId || "all"}:${clientId || "all"}:${locationId || "all"}:${status || "all"}`;
  const cachedData = await getCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }

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

  const whereSql = buildConditions({
    startDate,
    componentId,
    clientId,
    locationId,
    status,
  });

  // 2. Run Database Aggregations in parallel for maximum speed
  const [
    kpiRows,
    prevKpiRows,
    mttrRows,
    monthlyTrendRows,
    topFailureCodesRaw,
    problematicUnitsRaw,
    totalAssetsCount,
    filterComponents,
    filterClients,
    filterLocations,
  ] = await Promise.all([
    // Core KPIs
    prisma.$queryRaw(Prisma.sql`
      SELECT 
        COUNT(t.id)::int as total_tickets,
        COUNT(CASE WHEN th.status = 'open' THEN 1 END)::int as open_tickets,
        COUNT(CASE WHEN th.status = 'escalated' THEN 1 END)::int as monitor_tickets,
        COUNT(CASE WHEN th.status = 'solved' THEN 1 END)::int as solved_tickets,
        COUNT(DISTINCT a.unit_code)::int as affected_units
      FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      JOIN failure_codes fc ON fc.id = t.failure_code_id
      JOIN assets a ON a.id = t.asset_id
      WHERE ${whereSql}
    `),

    // Previous Period Tickets Count (for vs periode lalu)
    prevStartDate && prevEndDate
      ? prisma.$queryRaw(Prisma.sql`
          SELECT COUNT(t.id)::int as prev_total
          FROM tickets t
          JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
          JOIN failure_codes fc ON fc.id = t.failure_code_id
          JOIN assets a ON a.id = t.asset_id
          WHERE ${buildConditions({
            startDate: prevStartDate,
            endDate: prevEndDate,
            componentId,
            clientId,
            locationId,
            status,
          })}
        `)
      : Promise.resolve([{ prev_total: 0 }]),

    // MTTR calculation
    prisma.$queryRaw(Prisma.sql`
      SELECT 
        COUNT(*)::int as resolved_count,
        COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(t.solved_at, th.changed_at) - t.open_at)) / 3600), 0)::float as avg_hours
      FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      JOIN failure_codes fc ON fc.id = t.failure_code_id
      JOIN assets a ON a.id = t.asset_id
      WHERE ${whereSql}
        AND (th.status = 'solved' OR t.solved_at IS NOT NULL)
        AND (COALESCE(t.solved_at, th.changed_at) >= t.open_at)
    `),

    // Monthly Trend
    prisma.$queryRaw(Prisma.sql`
      SELECT 
        TO_CHAR(t.open_at, 'YYYY-MM') as month_key,
        COUNT(t.id)::int as count
      FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      JOIN failure_codes fc ON fc.id = t.failure_code_id
      JOIN assets a ON a.id = t.asset_id
      WHERE ${whereSql}
      GROUP BY TO_CHAR(t.open_at, 'YYYY-MM')
      ORDER BY month_key ASC
    `),

    // Top 5 failure codes
    prisma.$queryRaw(Prisma.sql`
      SELECT 
        fc.code,
        COALESCE(fc.description, fc.name, 'Kerusakan tidak terdefinisi') as description,
        COUNT(t.id)::int as count
      FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      JOIN failure_codes fc ON fc.id = t.failure_code_id
      JOIN assets a ON a.id = t.asset_id
      WHERE ${whereSql}
      GROUP BY fc.code, fc.description, fc.name
      ORDER BY count DESC
      LIMIT 5
    `),

    // Top 5 problematic units
    prisma.$queryRaw(Prisma.sql`
      SELECT 
        a.unit_code as "unitCode",
        COUNT(t.id)::int as count
      FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      JOIN failure_codes fc ON fc.id = t.failure_code_id
      JOIN assets a ON a.id = t.asset_id
      WHERE ${whereSql}
      GROUP BY a.unit_code
      ORDER BY count DESC
      LIMIT 5
    `),

    // Total active assets
    prisma.assets.count({ where: { is_active: true } }),

    // Dropdown options
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

  // 3. Process KPI values
  const kpi = kpiRows[0] || {};
  const totalTickets = Number(kpi.total_tickets || 0);
  const openTickets = Number(kpi.open_tickets || 0);
  const monitorTickets = Number(kpi.monitor_tickets || 0);
  const solvedTickets = Number(kpi.solved_tickets || 0);
  const completedTickets = solvedTickets;
  const completionRate = totalTickets > 0 ? Math.round((completedTickets / totalTickets) * 100) : 0;
  const affectedUnits = Number(kpi.affected_units || 0);
  const totalOperationalUnits = Math.max(totalAssetsCount, affectedUnits, 1);

  // Previous period comparison
  const prevTotalTickets = Number(prevKpiRows[0]?.prev_total || 0);
  let vsPrevText = "vs periode lalu";
  if (prevTotalTickets > 0 && totalTickets > 0) {
    const diffPct = Math.round(((totalTickets - prevTotalTickets) / prevTotalTickets) * 100);
    vsPrevText = `${diffPct >= 0 ? "+" : ""}${diffPct}% vs periode lalu`;
  }

  // MTTR values
  const mttr = mttrRows[0] || {};
  const resolvedCount = Number(mttr.resolved_count || 0);
  const avgHours = Number(mttr.avg_hours || 0);
  const mttrHours = resolvedCount > 0 ? Number(avgHours.toFixed(1)) : 0;
  const mttrDays = resolvedCount > 0 ? Number((avgHours / 24).toFixed(1)) : 0;

  // 4. Monthly Trend Mapping
  const monthlyMap = new Map();
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = formatMonthYear(d);
    monthlyMap.set(key, 0);
  }

  for (const row of monthlyTrendRows) {
    if (row.month_key) {
      const [y, m] = row.month_key.split("-").map(Number);
      const d = new Date(y, m - 1, 1);
      const key = formatMonthYear(d);
      if (monthlyMap.has(key)) {
        monthlyMap.set(key, monthlyMap.get(key) + Number(row.count));
      } else if (timeRange === "all") {
        monthlyMap.set(key, Number(row.count));
      }
    }
  }

  const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, count]) => ({
    month,
    count,
  }));

  // 5. Status Distribution Data
  const statusDistribution = [
    {
      status: "Solved",
      count: solvedTickets,
      color: "#10b981",
      percent: totalTickets ? Math.round((solvedTickets / totalTickets) * 100) : 0,
    },
    {
      status: "Open",
      count: openTickets,
      color: "#ef4444",
      percent: totalTickets ? Math.round((openTickets / totalTickets) * 100) : 0,
    },
    {
      status: "Escalated",
      count: monitorTickets,
      color: "#f59e0b",
      percent: totalTickets ? Math.round((monitorTickets / totalTickets) * 100) : 0,
    },
  ];

  // 6. Top 5 Failure Codes
  const topFailureCodes = topFailureCodesRaw.map((fc) => ({
    code: fc.code,
    description: fc.description,
    count: Number(fc.count),
  }));

  // 7. Top 5 Problematic Units with percentage calculation
  const maxUnitCount = problematicUnitsRaw.length > 0 ? Number(problematicUnitsRaw[0].count) : 1;
  const topUnits = problematicUnitsRaw.map((u) => {
    const c = Number(u.count);
    return {
      unitCode: u.unitCode,
      count: c,
      percentage: Math.round((c / maxUnitCount) * 100),
    };
  });

  const result = {
    kpis: {
      totalTickets,
      vsPrevPeriodText: vsPrevText,
      openTickets,
      monitorTickets,
      completedTickets,
      completionRate,
      mttrDays: mttrDays.toFixed(1),
      mttrHours: mttrHours.toFixed(1),
      resolvedCount,
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
      components: filterComponents.map((c) => ({
        id: c.id,
        label: `${c.prefix ? c.prefix + " - " : ""}${c.name}`,
      })),
      clients: filterClients.map((c) => ({ id: c.id, label: c.name })),
      locations: filterLocations.map((l) => ({ id: l.id, label: l.name })),
      statuses: [
        { value: "all", label: "Semua status" },
        { value: "open", label: "Open" },
        { value: "escalated", label: "Escalated" },
        { value: "solved", label: "Solved" },
      ],
    },
  };

  // Cache in Redis for 60 seconds
  await setCache(cacheKey, result, 60);

  return result;
}
