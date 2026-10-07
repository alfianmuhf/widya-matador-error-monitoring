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
  leader_assignee: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          division: true,
        },
      },
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
  ticket_assignees: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          division: true,
        },
      },
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
    orderBy: {
      created_at: "asc",
    },
  },
  ticket_history: {
    include: {
      changed_by_user: {
        select: {
          id: true,
          name: true,
          email: true,
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
 * Find paginated list of tickets with filters
 */
export const findMany = async ({ skip = 0, take = 10, where = {}, orderBy = { created_at: "desc" } }) => {
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
    include: ticketIncludes,
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
export const updateWithHistory = async (ticketId, nextVersion, historyData) => {
  return prisma.$transaction(async (tx) => {
    await tx.tickets.update({
      where: { id: ticketId },
      data: {
        current_version: nextVersion,
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
          email: true,
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
          email: true,
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
 * Find assignees for a ticket
 */
export const findAssigneesByTicketId = async (ticketId) => {
  return prisma.ticket_assignees.findMany({
    where: { ticket_id: ticketId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          division: true,
        },
      },
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
    orderBy: {
      created_at: "asc",
    },
  });
};

/**
 * Find assignee by ID
 */
export const findAssigneeById = async (assigneeId) => {
  return prisma.ticket_assignees.findUnique({
    where: { id: assigneeId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          division: true,
        },
      },
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
  });
};

/**
 * Check if a user / telegram user is already assigned to a ticket
 */
export const findAssigneeByTicketAndMember = async (ticketId, { userId, telegramUserId }) => {
  const conditions = [];
  if (userId) conditions.push({ user_id: userId });
  if (telegramUserId) conditions.push({ telegram_user_id: telegramUserId });
  if (conditions.length === 0) return null;

  return prisma.ticket_assignees.findFirst({
    where: {
      ticket_id: ticketId,
      OR: conditions,
    },
    include: {
      user: true,
      telegram_user: true,
    },
  });
};

/**
 * Add member to ticket_assignees and optionally set as leader
 */
export const addAssigneeToTicket = async (ticketId, { userId, telegramUserId, isLeader = false }) => {
  return prisma.$transaction(async (tx) => {
    const assignee = await tx.ticket_assignees.create({
      data: {
        ticket_id: ticketId,
        user_id: userId || null,
        telegram_user_id: telegramUserId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            division: true,
          },
        },
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
    });

    if (isLeader) {
      await tx.tickets.update({
        where: { id: ticketId },
        data: { leader_assignee_id: assignee.id },
      });
    }

    return assignee;
  });
};

/**
 * Update leader_assignee_id on a ticket
 */
export const setTicketLeader = async (ticketId, assigneeId) => {
  return prisma.tickets.update({
    where: { id: ticketId },
    data: { leader_assignee_id: assigneeId },
    include: ticketIncludes,
  });
};

/**
 * Remove assignee from ticket
 */
export const removeAssigneeFromTicket = async (ticketId, assigneeId) => {
  return prisma.$transaction(async (tx) => {
    // If this assignee is the leader, unset leader_assignee_id first
    const ticket = await tx.tickets.findUnique({
      where: { id: ticketId },
      select: { leader_assignee_id: true },
    });

    if (ticket?.leader_assignee_id === assigneeId) {
      await tx.tickets.update({
        where: { id: ticketId },
        data: { leader_assignee_id: null },
      });
    }

    return tx.ticket_assignees.delete({
      where: { id: assigneeId },
    });
  });
};

/**
 * Update an existing assignee in ticket_assignees
 */
export const updateAssigneeInTicket = async (assigneeId, { userId, telegramUserId }) => {
  return prisma.ticket_assignees.update({
    where: { id: assigneeId },
    data: {
      user_id: userId,
      telegram_user_id: telegramUserId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          division: true,
        },
      },
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
  });
};

