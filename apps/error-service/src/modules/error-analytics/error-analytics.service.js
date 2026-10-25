import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma.js";
import { getCache, setCache } from "../../config/redis.js";

/**
 * Build dynamic Prisma.sql conditions for Error Analytics SQL aggregation queries
 */
function buildConditions({ startDate, componentId, clientId, locationId, status }) {
  const conditions = [Prisma.sql`1=1`];

  if (startDate) {
    conditions.push(Prisma.sql`t.open_at >= ${startDate}`);
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
 * Service to aggregate and calculate Error Analytics metrics using PostgreSQL aggregations and Redis caching
 */
export async function getErrorAnalyticsData(query = {}) {
  const {
    timeRange = "6m",
    componentId,
    clientId,
    locationId,
    status,
  } = query;

  // 1. Check Redis Cache
  const cacheKey = `analytics:${timeRange}:${componentId || "all"}:${clientId || "all"}:${locationId || "all"}:${status || "all"}`;
  const cachedData = await getCache(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const now = new Date();
  let startDate = null;

  if (timeRange === "30d") {
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (timeRange === "90d") {
    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  } else if (timeRange === "6m") {
    startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  } else {
    startDate = null;
  }

  const whereSql = buildConditions({
    startDate,
    componentId,
    clientId,
    locationId,
    status,
  });

  // 2. Run Database Aggregations in parallel
  const [
    totalRes,
    componentRows,
    paretoRows,
    clientRows,
    topUnitsRes,
    topCompsRes,
    filterComponents,
    filterClients,
    filterLocations,
  ] = await Promise.all([
    // Total tickets count
    prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(t.id)::int as total
      FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      JOIN failure_codes fc ON fc.id = t.failure_code_id
      JOIN assets a ON a.id = t.asset_id
      WHERE ${whereSql}
    `),

    // Dataset 1: Tickets per component
    prisma.$queryRaw(Prisma.sql`
      SELECT 
        c.id as "componentId",
        c.name as name,
        COUNT(t.id)::int as count
      FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      JOIN failure_codes fc ON fc.id = t.failure_code_id
      JOIN components c ON c.id = fc.component_id
      JOIN assets a ON a.id = t.asset_id
      WHERE ${whereSql}
      GROUP BY c.id, c.name
      ORDER BY count ASC
    `),

    // Dataset 2: Pareto failure code
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
    `),

    // Dataset 3: Sebaran per client (top 8)
    prisma.$queryRaw(Prisma.sql`
      SELECT 
        cl.id as "clientId",
        cl.name as "clientName",
        COUNT(t.id)::int as count
      FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      JOIN failure_codes fc ON fc.id = t.failure_code_id
      JOIN assets a ON a.id = t.asset_id
      JOIN clients cl ON cl.id = a.client_id
      WHERE ${whereSql}
      GROUP BY cl.id, cl.name
      ORDER BY count DESC
      LIMIT 8
    `),

    // Heatmap top units (top 8)
    prisma.$queryRaw(Prisma.sql`
      SELECT a.unit_code, COUNT(t.id)::int as count
      FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      JOIN failure_codes fc ON fc.id = t.failure_code_id
      JOIN assets a ON a.id = t.asset_id
      WHERE ${whereSql}
      GROUP BY a.unit_code
      ORDER BY count DESC
      LIMIT 8
    `),

    // Heatmap top components (top 6)
    prisma.$queryRaw(Prisma.sql`
      SELECT c.name, COUNT(t.id)::int as count
      FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      JOIN failure_codes fc ON fc.id = t.failure_code_id
      JOIN components c ON c.id = fc.component_id
      JOIN assets a ON a.id = t.asset_id
      WHERE ${whereSql}
      GROUP BY c.name
      ORDER BY count DESC
      LIMIT 6
    `),

    // Filter Options
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

  const totalTickets = Number(totalRes[0]?.total || 0);

  // 3. Dataset 1: Tickets per component
  const ticketsPerComponent = componentRows.map((r) => ({
    componentId: r.componentId,
    name: r.name,
    count: Number(r.count),
  }));

  // 4. Dataset 2: Pareto failure code calculation
  let runningCount = 0;
  const paretoFailureCode = paretoRows.map((item) => {
    const c = Number(item.count);
    runningCount += c;
    const cumulativePercent =
      totalTickets > 0
        ? Number(((runningCount / totalTickets) * 100).toFixed(1))
        : 0;
    return {
      code: item.code,
      description: item.description,
      count: c,
      cumulativePercent,
    };
  });

  // 5. Dataset 3: Sebaran per client (top 8)
  const sebaranPerClient = clientRows.map((r) => ({
    clientId: r.clientId,
    clientName: r.clientName,
    count: Number(r.count),
  }));

  // 6. Dataset 4: Heatmap unit x component
  const heatmapUnits = topUnitsRes.map((u) => u.unit_code);
  const heatmapComponents = topCompsRes.map((c) => c.name);

  let matrixCounts = {};
  if (heatmapUnits.length > 0 && heatmapComponents.length > 0) {
    const matrixRows = await prisma.$queryRaw(Prisma.sql`
      SELECT a.unit_code, c.name as comp_name, COUNT(t.id)::int as count
      FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      JOIN failure_codes fc ON fc.id = t.failure_code_id
      JOIN components c ON c.id = fc.component_id
      JOIN assets a ON a.id = t.asset_id
      WHERE ${whereSql}
        AND a.unit_code IN (${Prisma.join(heatmapUnits)})
        AND c.name IN (${Prisma.join(heatmapComponents)})
      GROUP BY a.unit_code, c.name
    `);

    for (const row of matrixRows) {
      matrixCounts[`${row.unit_code}:::${row.comp_name}`] = Number(row.count);
    }
  }

  const heatmapData = [];
  heatmapUnits.forEach((unit, unitIdx) => {
    heatmapComponents.forEach((comp, compIdx) => {
      const count = matrixCounts[`${unit}:::${comp}`] || 0;
      heatmapData.push([compIdx, unitIdx, count]);
    });
  });

  const result = {
    totalTickets,
    ticketsPerComponent,
    paretoFailureCode,
    sebaranPerClient,
    heatmap: {
      units: heatmapUnits,
      components: heatmapComponents,
      data: heatmapData,
    },
    filterOptions: {
      components: filterComponents.map((c) => ({
        id: c.id,
        label: `${c.prefix ? c.prefix + " - " : ""}${c.name}`,
        name: c.name,
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
