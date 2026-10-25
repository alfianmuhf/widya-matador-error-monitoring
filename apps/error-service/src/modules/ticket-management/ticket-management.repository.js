import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma.js";
import { ticketIncludes } from "../ticket/ticket.repository.js";

/**
 * Hitung statistik KPI tiket yang dikelola coordinator/admin langsung via SQL:
 * - Admin: tiket open & escalated
 * - Aftersales: tiket open & aftersales_user_id = userId
 * - Software / RnD: tiket escalated & userId ada di ticket_assignees
 */
export const getManagedTicketsKPI = async ({ userId, division, role }) => {
  const userRole = (role || "").toLowerCase();

  if (userRole === "admin") {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT 
        COUNT(DISTINCT t.id)::int as total,
        COUNT(DISTINCT CASE WHEN th_current.severity = 'tinggi' THEN t.id END)::int as high_severity_count
      FROM tickets t
      JOIN ticket_history th_current ON th_current.ticket_id = t.id AND th_current.version = t.current_version
      WHERE th_current.status IN ('open'::ticket_status, 'escalated'::ticket_status)
    `);
    return {
      total: Number(rows[0]?.total || 0),
      highSeverityCount: Number(rows[0]?.high_severity_count || 0),
    };
  }

  if (!userId || !division) {
    return { total: 0, highSeverityCount: 0 };
  }

  const div = division.toLowerCase();

  if (div === "after_sales") {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT 
        COUNT(DISTINCT t.id)::int as total,
        COUNT(DISTINCT CASE WHEN th_current.severity = 'tinggi' THEN t.id END)::int as high_severity_count
      FROM tickets t
      JOIN ticket_history th_current ON th_current.ticket_id = t.id AND th_current.version = t.current_version
      WHERE th_current.status = 'open'::ticket_status
        AND t.aftersales_user_id = ${userId}::uuid
    `);
    return {
      total: Number(rows[0]?.total || 0),
      highSeverityCount: Number(rows[0]?.high_severity_count || 0),
    };
  }

  if (div === "software" || div === "rnd") {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT 
        COUNT(DISTINCT t.id)::int as total,
        COUNT(DISTINCT CASE WHEN th_current.severity = 'tinggi' THEN t.id END)::int as high_severity_count
      FROM tickets t
      JOIN ticket_history th_current ON th_current.ticket_id = t.id AND th_current.version = t.current_version
      JOIN ticket_teams tt ON tt.ticket_id = t.id
      JOIN teams team ON team.id = tt.team_id
      LEFT JOIN team_members tm ON tm.team_id = tt.team_id AND tm.user_id = ${userId}::uuid
      WHERE th_current.status = 'escalated'::ticket_status
        AND (team.leader_user_id = ${userId}::uuid OR tm.user_id = ${userId}::uuid)
    `);
    return {
      total: Number(rows[0]?.total || 0),
      highSeverityCount: Number(rows[0]?.high_severity_count || 0),
    };
  }

  return { total: 0, highSeverityCount: 0 };
};

/**
 * Mengambil ID tiket yang harus dikelola oleh coordinator/admin (dengan pagination dan filter opsional)
 */
export const findManagedTicketIds = async ({
  userId,
  division,
  role,
  severity,
  search,
  limit = 50,
  skip = 0,
}) => {
  const userRole = (role || "").toLowerCase();
  const div = (division || "").toLowerCase();

  const conditions = [];

  if (userRole === "admin") {
    conditions.push(Prisma.sql`th_current.status IN ('open'::ticket_status, 'escalated'::ticket_status)`);
  } else if (div === "after_sales") {
    conditions.push(Prisma.sql`th_current.status = 'open'::ticket_status`);
    conditions.push(Prisma.sql`t.aftersales_user_id = ${userId}::uuid`);
  } else if (div === "software" || div === "rnd") {
    conditions.push(Prisma.sql`th_current.status = 'escalated'::ticket_status`);
    conditions.push(Prisma.sql`(team.leader_user_id = ${userId}::uuid OR tm.user_id = ${userId}::uuid)`);
  } else {
    return [];
  }

  if (severity && severity !== "all") {
    conditions.push(Prisma.sql`th_current.severity = ${severity.toLowerCase()}::severity`);
  }

  if (search) {
    const q = `%${search.trim().toLowerCase()}%`;
    conditions.push(Prisma.sql`(
      LOWER(t.id) LIKE ${q}
      OR LOWER(a.unit_code) LIKE ${q}
      OR LOWER(fc.code) LIKE ${q}
      OR LOWER(th_current.damage_description) LIKE ${q}
    )`);
  }

  const whereClause = Prisma.join(conditions, " AND ");

  const joinAssignees =
    div === "software" || div === "rnd"
      ? Prisma.sql`
          JOIN ticket_teams tt ON tt.ticket_id = t.id
          JOIN teams team ON team.id = tt.team_id
          LEFT JOIN team_members tm ON tm.team_id = tt.team_id AND tm.user_id = ${userId}::uuid
        `
      : Prisma.empty;

  const joinExtras = search
    ? Prisma.sql`
        JOIN failure_codes fc ON fc.id = t.failure_code_id
        JOIN assets a ON a.id = t.asset_id
      `
    : Prisma.empty;

  const query = Prisma.sql`
    SELECT DISTINCT t.id, t.open_at
    FROM tickets t
    JOIN ticket_history th_current ON th_current.ticket_id = t.id AND th_current.version = t.current_version
    ${joinAssignees}
    ${joinExtras}
    WHERE ${whereClause}
    ORDER BY t.open_at DESC
    LIMIT ${limit} OFFSET ${skip}
  `;

  const rows = await prisma.$queryRaw(query);
  return rows.map((r) => r.id);
};

/**
 * Mengambil tiket lengkap berdasarkan daftar ID tiket (dengan batas wajar)
 */
export const findManagedTicketsByIds = async (ticketIds) => {
  if (!ticketIds || ticketIds.length === 0) return [];

  return prisma.tickets.findMany({
    where: {
      id: { in: ticketIds },
    },
    include: ticketIncludes,
    orderBy: {
      open_at: "desc",
    },
  });
};
