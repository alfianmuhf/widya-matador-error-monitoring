import prisma from "../../config/prisma.js";

const auditLogIncludes = {
  actorUser: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  actorTelegram: {
    select: {
      id: true,
      telegramId: true,
      username: true,
      fullName: true,
    },
  },
};

/**
 * Insert a new audit log record
 */
export const create = async (data) => {
  return prisma.auditLog.create({
    data,
    include: auditLogIncludes,
  });
};

/**
 * Get paginated list of audit logs
 */
export const findMany = async ({ skip = 0, take = 20, where = {}, orderBy = { createdAt: "desc" } }) => {
  return prisma.auditLog.findMany({
    skip,
    take,
    where,
    orderBy,
    include: auditLogIncludes,
  });
};

/**
 * Count total audit logs matching condition
 */
export const count = async (where = {}) => {
  return prisma.auditLog.count({ where });
};

/**
 * Find single audit log by ID
 */
export const findById = async (id) => {
  return prisma.auditLog.findUnique({
    where: { id },
    include: auditLogIncludes,
  });
};
