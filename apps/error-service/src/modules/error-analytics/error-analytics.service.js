import prisma from "../../config/prisma.js";
import { findTicketIdsByCurrentHistory } from "../ticket/ticket.repository.js";

/**
 * Service to aggregate and calculate Error Analytics metrics
 * Supports multi-dimensional filters: timeRange, componentId, clientId, locationId, status
 */
export async function getErrorAnalyticsData(query = {}) {
  const {
    timeRange = "6m",
    componentId,
    clientId,
    locationId,
    status,
  } = query;

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

  // 1. Build Where Clause
  const where = {};
  if (startDate) {
    where.open_at = { gte: startDate };
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

  // 2. Fetch Tickets with relevant relations
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
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      ticket_history: {
        orderBy: { version: "desc" },
        select: {
          version: true,
          status: true,
        },
      },
    },
    orderBy: {
      open_at: "asc",
    },
  });

  const totalTickets = tickets.length;

  // 3. Dataset 1: Tiket per component
  const componentMap = new Map();
  for (const t of tickets) {
    const compName = t.failure_code?.component?.name || "Lain-Lain";
    const compId = t.failure_code?.component?.id || null;
    if (!componentMap.has(compName)) {
      componentMap.set(compName, { componentId: compId, name: compName, count: 0 });
    }
    componentMap.get(compName).count++;
  }

  const ticketsPerComponent = Array.from(componentMap.values()).sort(
    (a, b) => a.count - b.count
  );

  // 4. Dataset 2: Pareto failure code
  const failureCodeMap = new Map();
  for (const t of tickets) {
    const code = t.failure_code?.code || "UNKNOWN";
    const description = t.failure_code?.description || t.failure_code?.name || "Kerusakan tidak terdefinisi";
    if (!failureCodeMap.has(code)) {
      failureCodeMap.set(code, { code, description, count: 0 });
    }
    failureCodeMap.get(code).count++;
  }

  const sortedFailureCodes = Array.from(failureCodeMap.values()).sort(
    (a, b) => b.count - a.count
  );

  let runningCount = 0;
  const paretoFailureCode = sortedFailureCodes.map((item) => {
    runningCount += item.count;
    const cumulativePercent =
      totalTickets > 0
        ? Number(((runningCount / totalTickets) * 100).toFixed(1))
        : 0;
    return {
      code: item.code,
      description: item.description,
      count: item.count,
      cumulativePercent,
    };
  });

  // 5. Dataset 3: Sebaran per client (top 8)
  const clientMap = new Map();
  for (const t of tickets) {
    const clientName = t.asset?.client?.name || "Klien Umum / Tidak Terdaftar";
    const clId = t.asset?.client?.id || null;
    if (!clientMap.has(clientName)) {
      clientMap.set(clientName, { clientId: clId, clientName, count: 0 });
    }
    clientMap.get(clientName).count++;
  }

  const sebaranPerClient = Array.from(clientMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // 6. Dataset 4: Peta panas unit × component (Heatmap)
  const unitCountMap = new Map();
  for (const t of tickets) {
    const u = t.asset?.unit_code;
    if (u) {
      unitCountMap.set(u, (unitCountMap.get(u) || 0) + 1);
    }
  }

  const topUnits = Array.from(unitCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([unitCode]) => unitCode);

  const compCountMap = new Map();
  for (const t of tickets) {
    const cName = t.failure_code?.component?.name;
    if (cName) {
      compCountMap.set(cName, (compCountMap.get(cName) || 0) + 1);
    }
  }

  const topHeatmapComponents = Array.from(compCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);

  const heatmapUnits = topUnits;
  const heatmapComponents = topHeatmapComponents;

  const matrixCounts = {};
  for (const t of tickets) {
    const u = t.asset?.unit_code;
    const c = t.failure_code?.component?.name;
    if (u && c && heatmapUnits.includes(u) && heatmapComponents.includes(c)) {
      const key = `${u}:::${c}`;
      matrixCounts[key] = (matrixCounts[key] || 0) + 1;
    }
  }

  const heatmapData = [];
  heatmapUnits.forEach((unit, unitIdx) => {
    heatmapComponents.forEach((comp, compIdx) => {
      const count = matrixCounts[`${unit}:::${comp}`] || 0;
      heatmapData.push([compIdx, unitIdx, count]);
    });
  });

  // 7. Filter Options
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
      components: components.map((c) => ({
        id: c.id,
        label: `${c.prefix ? c.prefix + " - " : ""}${c.name}`,
        name: c.name,
      })),
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
