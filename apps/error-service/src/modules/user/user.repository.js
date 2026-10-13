import { prisma } from "../../config/prisma.js";

/**
 * Find user by email
 * @param {string} email
 */
export const findUserByEmail = async (email) => {
  return prisma.users.findUnique({
    where: { email },
  });
};

/**
 * Find single user by ID (excluding password_hash)
 * @param {string} id
 */
export const findUserById = async (id) => {
  return prisma.users.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      division: true,
      status: true,
      must_change_password: true,
      failed_login_attempts: true,
      locked_until: true,
      last_login_at: true,
      password_changed_at: true,
      created_at: true,
      updated_at: true,
      telegram_user_id: true,
      telegram_user: {
        select: {
          id: true,
          telegram_id: true,
          username: true,
          full_name: true,
          division: true,
          is_active: true,
        },
      },
    },
  });
};

/**
 * Create a new user record
 * @param {object} data
 */
export const createUser = async (data) => {
  return prisma.users.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role || "viewer",
      division: data.division || null,
      password_hash: data.password_hash || data.passwordHash,
      status: data.status || "active",
      must_change_password: data.must_change_password ?? data.mustChangePassword ?? true,
      telegram_user_id: data.telegram_user_id ?? data.telegramUserId ?? null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      division: true,
      status: true,
      must_change_password: true,
      created_at: true,
      telegram_user_id: true,
      telegram_user: {
        select: {
          id: true,
          telegram_id: true,
          username: true,
          full_name: true,
          division: true,
          is_active: true,
        },
      },
    },
  });
};

/**
 * Get users list with filtering and pagination
 * @param {object} params
 */
export const findUsers = async ({ skip = 0, take = 10, search, role, division, status }) => {
  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(role ? { role: role.toLowerCase() } : {}),
    ...(division ? { division: division.toLowerCase() } : {}),
    ...(status ? { status: status.toLowerCase() } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.users.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        division: true,
        status: true,
        must_change_password: true,
        failed_login_attempts: true,
        locked_until: true,
        last_login_at: true,
        created_at: true,
        updated_at: true,
        telegram_user_id: true,
        telegram_user: {
          select: {
            id: true,
            telegram_id: true,
            username: true,
            full_name: true,
            division: true,
            is_active: true,
          },
        },
      },
    }),
    prisma.users.count({ where }),
  ]);

  return { users, total };
};

/**
 * Update user by ID
 * @param {string} id
 * @param {object} data
 */
export const updateUser = async (id, data) => {
  return prisma.users.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      division: true,
      status: true,
      must_change_password: true,
      failed_login_attempts: true,
      locked_until: true,
      last_login_at: true,
      password_changed_at: true,
      created_at: true,
      updated_at: true,
      telegram_user_id: true,
      telegram_user: {
        select: {
          id: true,
          telegram_id: true,
          username: true,
          full_name: true,
          division: true,
          is_active: true,
        },
      },
    },
  });
};

/**
 * Revoke all active refresh tokens for a user
 * @param {string} userId
 */
export const revokeUserRefreshTokens = async (userId) => {
  return prisma.refresh_tokens.updateMany({
    where: {
      user_id: userId,
      revoked_at: null,
    },
    data: {
      revoked_at: new Date(),
    },
  });
};

/**
 * Delete user by ID and handle relations gracefully
 * @param {string} id
 */
export const deleteUser = async (id) => {
  return prisma.$transaction(async (tx) => {
    // 1. Unlink actor_user_id on audit logs to preserve audit records
    await tx.audit_logs.updateMany({
      where: { actor_user_id: id },
      data: { actor_user_id: null },
    });

    // 2. Delete related assignees, export jobs, and refresh tokens
    await tx.ticket_assignees.deleteMany({ where: { user_id: id } });
    await tx.export_jobs.deleteMany({ where: { requested_by_user_id: id } });
    await tx.refresh_tokens.deleteMany({ where: { user_id: id } });

    // 3. Delete the user
    return tx.users.delete({
      where: { id },
    });
  });
};

/**
 * Count active relations / foreign keys that reference this user
 * @param {string} userId
 */
export const countUserDependencies = async (userId) => {
  const [ticketHistories, exportJobs, auditLogs, ticketAssignees] = await Promise.all([
    prisma.ticket_history.count({ where: { changed_by_user_id: userId } }),
    prisma.export_jobs.count({ where: { requested_by_user_id: userId } }),
    prisma.audit_logs.count({ where: { actor_user_id: userId } }),
    prisma.ticket_assignees.count({ where: { user_id: userId } }),
  ]);

  return {
    ticketHistories,
    exportJobs,
    auditLogs,
    ticketAssignees,
    total: ticketHistories + exportJobs + auditLogs + ticketAssignees,
  };
};
