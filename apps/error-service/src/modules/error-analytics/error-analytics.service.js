import prisma from "../../config/prisma.js";

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
    // "all"
    startDate = null;
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

  // 2. Fetch Tickets with relevant relations
  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      component: {
        select: {
          id: true,
          name: true,
          prefix: true,
        },
      },
      failureCode: {
        select: {
          id: true,
          code: true,
          description: true,
        },
      },
      asset: {
        select: {
          unitCode: true,
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
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const totalTickets = tickets.length;

  // 3. Dataset 1: Tiket per component
  const componentMap = new Map();
  for (const t of tickets) {
    const compName = t.component?.name || "Lain-Lain";
    const compId = t.component?.id || null;
    if (!componentMap.has(compName)) {
      componentMap.set(compName, { componentId: compId, name: compName, count: 0 });
    }
    componentMap.get(compName).count++;
  }

  // Sort ascending by count (so lowest at top/bottom as in reference)
  const ticketsPerComponent = Array.from(componentMap.values()).sort(
    (a, b) => a.count - b.count
  );

  // 4. Dataset 2: Pareto failure code (bar = jumlah, line = kumulatif %)
  const failureCodeMap = new Map();
  for (const t of tickets) {
    const code = t.failureCode?.code || "UNKNOWN";
    const description = t.failureCode?.description || "Kerusakan tidak terdefinisi";
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
  // Determine top busy units (top 8)
  const unitCountMap = new Map();
  for (const t of tickets) {
    const u = t.unitCode;
    if (u) {
      unitCountMap.set(u, (unitCountMap.get(u) || 0) + 1);
    }
  }

  const topUnits = Array.from(unitCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([unitCode]) => unitCode);

  // Determine top components (top 6)
  const compCountMap = new Map();
  for (const t of tickets) {
    const cName = t.component?.name;
    if (cName) {
      compCountMap.set(cName, (compCountMap.get(cName) || 0) + 1);
    }
  }

  const topHeatmapComponents = Array.from(compCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name);

  // Fallback defaults if dataset is small
  const heatmapUnits = topUnits.length > 0 ? topUnits : ["STATIC005", "LSP-033", "LSP-020", "STATIC001"];
  const heatmapComponents =
    topHeatmapComponents.length > 0
      ? topHeatmapComponents
      : ["Mini PC", "Lidar & Controller", "CCTV", "Network", "Accu & Power System", "Cable & Connector"];

  // Compute cell counts for unit x component
  const matrixCounts = {};
  for (const t of tickets) {
    const u = t.unitCode;
    const c = t.component?.name;
    if (u && c && heatmapUnits.includes(u) && heatmapComponents.includes(c)) {
      const key = `${u}:::${c}`;
      matrixCounts[key] = (matrixCounts[key] || 0) + 1;
    }
  }

  // Generate ECharts heatmap data array: [colIndex (component), rowIndex (unit), value]
  const heatmapData = [];
  heatmapUnits.forEach((unit, unitIdx) => {
    heatmapComponents.forEach((comp, compIdx) => {
      const count = matrixCounts[`${unit}:::${comp}`] || 0;
      heatmapData.push([compIdx, unitIdx, count]);
    });
  });

  // 7. Filter Options
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
        { value: "closed", label: "Closed" },
      ],
    },
  };
}
