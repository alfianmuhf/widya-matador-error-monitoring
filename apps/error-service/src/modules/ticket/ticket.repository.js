import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma.js";

export const ticketIncludes = {
  asset: {
    include: {
      client: {
        select: {
          id: true,
          name: true,
          is_active: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          is_active: true,
        },
      },
    },
  },
  failure_code: {
    include: {
      component: {
        select: {
          id: true,
          prefix: true,
          name: true,
          sort_order: true,
        },
      },
    },
  },
  aftersales_user: {
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      division: true,
      telegram_user: {
        select: {
          id: true,
          telegram_id: true,
          username: true,
          full_name: true,
          division: true,
        },
      },
    },
  },
  current_team: {
    include: {
      leader: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          division: true,
          telegram_user: {
            select: {
              id: true,
              telegram_id: true,
              username: true,
              full_name: true,
            },
          },
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              division: true,
              telegram_user: {
                select: {
                  id: true,
                  telegram_id: true,
                  username: true,
                  full_name: true,
                },
              },
            },
          },
        },
        orderBy: { joined_at: "asc" },
      },
    },
  },
  ticket_teams: {
    include: {
      team: {
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              division: true,
              telegram_user: {
                select: {
                  id: true,
                  telegram_id: true,
                  username: true,
                  full_name: true,
                },
              },
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  role: true,
                  division: true,
                  telegram_user: {
                    select: {
                      id: true,
                      telegram_id: true,
                      username: true,
                      full_name: true,
                    },
                  },
                },
              },
            },
            orderBy: { joined_at: "asc" },
          },
        },
      },
    },
    orderBy: {
      assigned_at: "asc",
    },
  },
  ticket_history: {
    include: {
      team: {
        select: {
          id: true,
          name: true,
        },
      },
      changed_by_user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          division: true,
        },
      },
      changed_by_telegram: {
        select: {
          id: true,
          telegram_id: true,
          username: true,
          full_name: true,
          division: true,
        },
      },
    },
    orderBy: {
      version: "desc",
    },
  },
};

/**
 * Include for ticket detail only. The list query must not pull attachment rows:
 * a 1000-row page would otherwise carry up to 5000 metadata rows.
 */
export const ticketDetailIncludes = {
  ...ticketIncludes,
  ticket_attachments: {
    include: {
      uploaded_by_user: {
        select: { id: true, name: true, username: true },
      },
      uploaded_by_telegram: {
        select: { id: true, username: true, full_name: true },
      },
    },
    orderBy: {
      uploaded_at: "asc",
    },
  },
};

/**
 * Find paginated list of tickets with filters
 */
export const findMany = async ({ skip = 0, take = 10, where = {}, orderBy = { open_at: "desc" } }) => {
  return prisma.tickets.findMany({
    skip,
    take,
    where,
    orderBy,
    include: ticketIncludes,
  });
};

/**
 * Count total tickets matching condition
 */
export const count = async (where = {}) => {
  return prisma.tickets.count({ where });
};

/**
 * Find single ticket by ID
 */
export const findById = async (id) => {
  return prisma.tickets.findUnique({
    where: { id },
    include: ticketDetailIncludes,
  });
};

/**
 * Find the latest ticket ID for today to calculate the sequence counter
 * Format: ERR-YYYYMMDD-NNNN
 */
export const findLatestByDatePrefix = async (prefix) => {
  return prisma.tickets.findFirst({
    where: {
      id: {
        startsWith: prefix,
      },
    },
    orderBy: {
      id: "desc",
    },
    select: {
      id: true,
    },
  });
};

/**
 * Count tickets where current status is 'open'
 */
export const countOpenTickets = async () => {
  const result = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM tickets t
    JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
    WHERE th.status = 'open'::ticket_status
  `;
  return result[0]?.count || 0;
};

/**
 * Find ticket IDs matching current history status or severity
 */
export const findTicketIdsByCurrentHistory = async ({ status, severity }) => {
  if (status && severity) {
    const rows = await prisma.$queryRaw`
      SELECT t.id FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      WHERE th.status = ${status}::ticket_status AND th.severity = ${severity}::severity
    `;
    return rows.map((r) => r.id);
  }

  if (status) {
    const rows = await prisma.$queryRaw`
      SELECT t.id FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      WHERE th.status = ${status}::ticket_status
    `;
    return rows.map((r) => r.id);
  }

  if (severity) {
    const rows = await prisma.$queryRaw`
      SELECT t.id FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      WHERE th.severity = ${severity}::severity
    `;
    return rows.map((r) => r.id);
  }

  return null;
};

/**
 * Find paginated ticket IDs and total count when filtering by status/severity,
 * preventing Prisma parameter limit overflow when tens of thousands of tickets match.
 */
export const findFilteredTicketIdsAndCount = async ({
  status,
  severity,
  componentId,
  unitCode,
  clientId,
  locationId,
  startDate,
  endDate,
  search,
  sortBy = "open_at",
  sortOrder = "desc",
  skip = 0,
  take = 10,
}) => {
  const conditions = [Prisma.sql`1=1`];
  if (status) {
    const st = status.toLowerCase() === "monitor" ? "escalated" : status.toLowerCase();
    conditions.push(Prisma.sql`th.status = ${st}::ticket_status`);
  }
  if (severity) {
    conditions.push(Prisma.sql`th.severity = ${severity.toLowerCase()}::severity`);
  }
  if (componentId) {
    conditions.push(Prisma.sql`fc.component_id = ${componentId}::uuid`);
  }
  if (unitCode) {
    conditions.push(Prisma.sql`LOWER(a.unit_code) LIKE ${`%${unitCode.toLowerCase()}%`}`);
  }
  if (clientId) {
    conditions.push(Prisma.sql`a.client_id = ${clientId}::uuid`);
  }
  if (locationId) {
    conditions.push(Prisma.sql`a.location_id = ${locationId}::uuid`);
  }
  if (startDate) {
    conditions.push(Prisma.sql`t.open_at >= ${new Date(startDate)}`);
  }
  if (endDate) {
    const end = new Date(endDate);
    if (String(endDate).length === 10) end.setHours(23, 59, 59, 999);
    conditions.push(Prisma.sql`t.open_at <= ${end}`);
  }
  if (search) {
    const q = `%${search.trim().toLowerCase()}%`;
    conditions.push(Prisma.sql`(
      LOWER(t.id) LIKE ${q}
      OR LOWER(a.unit_code) LIKE ${q}
      OR LOWER(fc.code) LIKE ${q}
      OR LOWER(th.damage_description) LIKE ${q}
      OR LOWER(th.action_taken) LIKE ${q}
      OR LOWER(th.root_cause) LIKE ${q}
    )`);
  }

  const whereClause = Prisma.join(conditions, " AND ");

  const allowedSortCols = {
    open_at: Prisma.sql`t.open_at`,
    escalated_at: Prisma.sql`t.escalated_at`,
    solved_at: Prisma.sql`t.solved_at`,
    id: Prisma.sql`t.id`,
  };
  const sortCol = allowedSortCols[sortBy] || Prisma.sql`t.open_at`;
  const sortDir = sortOrder.toLowerCase() === "asc" ? Prisma.sql`ASC` : Prisma.sql`DESC`;

  const [countRows, idRows] = await Promise.all([
    prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(DISTINCT t.id)::int as total
      FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      JOIN failure_codes fc ON fc.id = t.failure_code_id
      JOIN assets a ON a.id = t.asset_id
      WHERE ${whereClause}
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT t.id
      FROM tickets t
      JOIN ticket_history th ON th.ticket_id = t.id AND th.version = t.current_version
      JOIN failure_codes fc ON fc.id = t.failure_code_id
      JOIN assets a ON a.id = t.asset_id
      WHERE ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ${take} OFFSET ${skip}
    `),
  ]);

  const total = Number(countRows[0]?.total || 0);
  const ids = idRows.map((r) => r.id);

  return { total, ids };
};

/**
 * Create a new ticket along with an initial ticket_history entry atomically
 * Initial version is strictly 0.
 */
export const createWithHistory = async (ticketData, historyData) => {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.tickets.create({
      data: {
        ...ticketData,
        current_version: 0,
      },
    });

    await tx.ticket_history.create({
      data: {
        ...historyData,
        ticket_id: ticket.id,
        version: 0,
      },
    });

    return tx.tickets.findUnique({
      where: { id: ticket.id },
      include: ticketIncludes,
    });
  });
};

/**
 * Update ticket data and create a new history record atomically
 * Increments current_version (1, 2, 3...)
 */
export const updateWithHistory = async (ticketId, nextVersion, historyData, ticketData = {}) => {
  return prisma.$transaction(async (tx) => {
    await tx.tickets.update({
      where: { id: ticketId },
      data: {
        current_version: nextVersion,
        ...ticketData,
      },
    });

    await tx.ticket_history.create({
      data: {
        ...historyData,
        ticket_id: ticketId,
        version: nextVersion,
      },
    });

    return tx.tickets.findUnique({
      where: { id: ticketId },
      include: ticketIncludes,
    });
  });
};

/**
 * Find full history list for a ticket
 */
export const findHistoryByTicketId = async (ticketId, { order = "desc" } = {}) => {
  return prisma.ticket_history.findMany({
    where: { ticket_id: ticketId },
    include: {
      changed_by_user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          division: true,
        },
      },
      changed_by_telegram: {
        select: {
          id: true,
          telegram_id: true,
          username: true,
          full_name: true,
          division: true,
        },
      },
    },
    orderBy: {
      version: order,
    },
  });
};

/**
 * Find specific history version for a ticket
 */
export const findHistoryByVersion = async (ticketId, version) => {
  return prisma.ticket_history.findUnique({
    where: {
      ticket_id_version: {
        ticket_id: ticketId,
        version: parseInt(version, 10),
      },
    },
    include: {
      changed_by_user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          division: true,
        },
      },
      changed_by_telegram: {
        select: {
          id: true,
          telegram_id: true,
          username: true,
          full_name: true,
          division: true,
        },
      },
    },
  });
};


/**
 * Check if a user is assigned to a ticket (either as leader or member of current_team or any ticket_teams)
 */
export const isUserAssignedToTicket = async (ticketId, userId) => {
  if (!userId) return false;

  const ticket = await prisma.tickets.findUnique({
    where: { id: ticketId },
    select: {
      current_team_id: true,
      current_team: {
        select: {
          leader_user_id: true,
          members: { select: { user_id: true } },
        },
      },
      ticket_teams: {
        select: {
          team: {
            select: {
              leader_user_id: true,
              members: { select: { user_id: true } },
            },
          },
        },
      },
    },
  });

  if (!ticket) return false;

  if (
    ticket.current_team &&
    (ticket.current_team.leader_user_id === userId ||
      ticket.current_team.members.some((m) => m.user_id === userId))
  ) {
    return true;
  }

  return (ticket.ticket_teams || []).some(
    (tt) =>
      tt.team?.leader_user_id === userId ||
      tt.team?.members.some((m) => m.user_id === userId)
  );
};

/**
 * Check if user is the leader of the current team on a ticket
 */
export const isUserLeaderOfCurrentTicketTeam = async (ticketId, userId) => {
  if (!userId) return false;

  const ticket = await prisma.tickets.findUnique({
    where: { id: ticketId },
    select: {
      current_team: {
        select: { leader_user_id: true },
      },
    },
  });

  return ticket?.current_team?.leader_user_id === userId;
};

/**
 * Backward compatibility: findAssigneeByTicketAndMember
 */
export const findAssigneeByTicketAndMember = async (ticketId, { userId }) => {
  if (!userId) return null;
  const isAssigned = await isUserAssignedToTicket(ticketId, userId);
  if (!isAssigned) return null;

  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: { telegram_user: true },
  });

  return user ? { user_id: userId, user } : null;
};

/**
 * Backward compatibility: findAssigneesByTicketId
 */
export const findAssigneesByTicketId = async (ticketId) => {
  const ticket = await prisma.tickets.findUnique({
    where: { id: ticketId },
    include: {
      current_team: {
        include: {
          leader: { include: { telegram_user: true } },
          members: { include: { user: { include: { telegram_user: true } } } },
        },
      },
      ticket_teams: {
        include: {
          team: {
            include: {
              leader: { include: { telegram_user: true } },
              members: { include: { user: { include: { telegram_user: true } } } },
            },
          },
        },
      },
    },
  });

  if (!ticket) return [];

  const map = new Map();
  if (ticket.current_team?.leader) {
    map.set(ticket.current_team.leader.id, {
      id: ticket.current_team.leader.id,
      ticket_id: ticketId,
      user_id: ticket.current_team.leader.id,
      user: ticket.current_team.leader,
      isLeader: true,
      created_at: ticket.open_at,
    });
  }

  (ticket.current_team?.members || []).forEach((m) => {
    if (m.user && !map.has(m.user.id)) {
      map.set(m.user.id, {
        id: m.id,
        ticket_id: ticketId,
        user_id: m.user.id,
        user: m.user,
        isLeader: m.user.id === ticket.current_team?.leader_user_id,
        created_at: m.joined_at,
      });
    }
  });

  (ticket.ticket_teams || []).forEach((tt) => {
    if (tt.team?.leader && !map.has(tt.team.leader.id)) {
      map.set(tt.team.leader.id, {
        id: tt.team.leader.id,
        ticket_id: ticketId,
        user_id: tt.team.leader.id,
        user: tt.team.leader,
        isLeader: tt.team.id === ticket.current_team_id,
        created_at: tt.assigned_at,
      });
    }
    (tt.team?.members || []).forEach((m) => {
      if (m.user && !map.has(m.user.id)) {
        map.set(m.user.id, {
          id: m.id,
          ticket_id: ticketId,
          user_id: m.user.id,
          user: m.user,
          isLeader: m.user.id === ticket.current_team?.leader_user_id,
          created_at: m.joined_at,
        });
      }
    });
  });

  return Array.from(map.values());
};

/**
 * Add team to ticket_teams
 */
export const addTeamToTicket = async (ticketId, teamId, tx = prisma) => {
  return tx.ticket_teams.upsert({
    where: {
      ticket_id_team_id: {
        ticket_id: ticketId,
        team_id: teamId,
      },
    },
    update: {},
    create: {
      ticket_id: ticketId,
      team_id: teamId,
    },
    include: {
      team: {
        include: {
          leader: true,
          members: { include: { user: true } },
        },
      },
    },
  });
};

/**
 * Remove team from ticket_teams
 */
export const removeTeamFromTicket = async (ticketId, teamId, tx = prisma) => {
  return tx.ticket_teams.deleteMany({
    where: {
      ticket_id: ticketId,
      team_id: teamId,
    },
  });
};

/**
 * Set current_team_id on a ticket and ensure team is in ticket_teams
 */
export const setTicketCurrentTeam = async (ticketId, teamId, tx = prisma) => {
  if (teamId) {
    await tx.ticket_teams.upsert({
      where: {
        ticket_id_team_id: {
          ticket_id: ticketId,
          team_id: teamId,
        },
      },
      update: {},
      create: {
        ticket_id: ticketId,
        team_id: teamId,
      },
    });
  }

  return tx.tickets.update({
    where: { id: ticketId },
    data: { current_team_id: teamId },
    include: ticketIncludes,
  });
};

/**
 * Update aftersales responsible user on ticket
 */
export const updateAftersalesLead = async (ticketId, aftersalesUserId) => {
  return prisma.tickets.update({
    where: { id: ticketId },
    data: { aftersales_user_id: aftersalesUserId },
    include: ticketIncludes,
  });
};

