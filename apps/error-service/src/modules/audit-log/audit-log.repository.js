import prisma from "../../config/prisma.js";

const auditLogIncludes = {
  user: {
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
    },
  },
  telegram_user: {
    select: {
      id: true,
      telegram_id: true,
      username: true,
      full_name: true,
    },
  },
};

/**
 * Insert a new audit log record
 */
export const create = async (data) => {
  return prisma.audit_logs.create({
    data,
    include: auditLogIncludes,
  });
};

/**
 * Get paginated list of audit logs
 */
export const findMany = async ({ skip = 0, take = 20, where = {}, orderBy = { created_at: "desc" } }) => {
  return prisma.audit_logs.findMany({
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
  return prisma.audit_logs.count({ where });
};

/**
 * Find single audit log by ID
 */
export const findById = async (id) => {
  return prisma.audit_logs.findUnique({
    where: { id },
    include: auditLogIncludes,
  });
};
