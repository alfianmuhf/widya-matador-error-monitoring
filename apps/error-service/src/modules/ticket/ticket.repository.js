import prisma from "../../config/prisma.js";

const ticketIncludes = {
  asset: {
    include: {
      client: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
    },
  },
  component: {
    select: {
      id: true,
      prefix: true,
      name: true,
    },
  },
  failureCode: {
    select: {
      id: true,
      code: true,
      description: true,
    },
  },
  reporterUser: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  reporterTelegram: {
    select: {
      id: true,
      telegramId: true,
      username: true,
      fullName: true,
    },
  },
  history: {
    include: {
      changedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      changedByTelegram: {
        select: {
          id: true,
          telegramId: true,
          username: true,
          fullName: true,
        },
      },
    },
    orderBy: {
      changedAt: "desc",
    },
  },
  attachments: true,
};

/**
 * Find paginated list of tickets with filters
 */
export const findMany = async ({ skip = 0, take = 10, where = {}, orderBy = { createdAt: "desc" } }) => {
  return prisma.ticket.findMany({
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
  return prisma.ticket.count({ where });
};

/**
 * Find single ticket by ticketId
 */
export const findById = async (ticketId) => {
  return prisma.ticket.findUnique({
    where: { ticketId },
    include: ticketIncludes,
  });
};

/**
 * Find the latest ticket ID for today to calculate the sequence counter
 * Format: ERR-YYYYMMDD-NNNN
 */
export const findLatestByDatePrefix = async (prefix) => {
  return prisma.ticket.findFirst({
    where: {
      ticketId: {
        startsWith: prefix,
      },
    },
    orderBy: {
      ticketId: "desc",
    },
    select: {
      ticketId: true,
    },
  });
};

/**
 * Create a new ticket along with an initial ticket_history entry atomically
 */
export const createWithHistory = async (ticketData, historyData) => {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: ticketData,
      include: ticketIncludes,
    });

    if (historyData) {
      await tx.ticketHistory.create({
        data: {
          ...historyData,
          ticketId: ticket.ticketId,
        },
      });
    }

    return tx.ticket.findUnique({
      where: { ticketId: ticket.ticketId },
      include: ticketIncludes,
    });
  });
};

/**
 * Update ticket data and create a history record atomically
 */
export const updateWithHistory = async (ticketId, updateData, historyData) => {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.ticket.update({
      where: { ticketId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    if (historyData) {
      await tx.ticketHistory.create({
        data: {
          ...historyData,
          ticketId,
        },
      });
    }

    return tx.ticket.findUnique({
      where: { ticketId },
      include: ticketIncludes,
    });
  });
};

/**
 * Add a comment / history record to a ticket
 */
export const addHistory = async (ticketId, historyData) => {
  return prisma.ticketHistory.create({
    data: {
      ...historyData,
      ticketId,
    },
    include: {
      changedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      changedByTelegram: {
        select: {
          id: true,
          telegramId: true,
          username: true,
          fullName: true,
        },
      },
    },
  });
};
