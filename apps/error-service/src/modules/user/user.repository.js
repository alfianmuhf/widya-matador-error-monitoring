import { prisma } from "../../config/prisma.js";

/**
 * Find user by email
 * @param {string} email
 */
export const findUserByEmail = async (email) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

/**
 * Find single user by ID (excluding passwordHash)
 * @param {string} id
 */
export const findUserById = async (id) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      mustChangePassword: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      lastLoginAt: true,
      passwordChangedAt: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
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
  return prisma.user.create({
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      mustChangePassword: true,
      createdById: true,
      createdAt: true,
    },
  });
};

/**
 * Get users list with filtering and pagination
 * @param {object} params
 */
export const findUsers = async ({ skip = 0, take = 10, search, role, status }) => {
  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        mustChangePassword: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total };
};

/**
 * Update user by ID
 * @param {string} id
 * @param {object} data
 */
export const updateUser = async (id, data) => {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      mustChangePassword: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      lastLoginAt: true,
      passwordChangedAt: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
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
  return prisma.refreshToken.updateMany({
    where: {
      userId,
      revoked: false,
    },
    data: {
      revoked: true,
      revokedAt: new Date(),
    },
  });
};

/**
 * Delete user by ID and handle relations gracefully
 * @param {string} id
 */
export const deleteUser = async (id) => {
  return prisma.$transaction(async (tx) => {
    // 1. Unlink any users created by this user
    await tx.user.updateMany({
      where: { createdById: id },
      data: { createdById: null },
    });

    // 2. Unlink any whitelisted telegram users created by this user
    await tx.telegramUser.updateMany({
      where: { whitelistedById: id },
      data: { whitelistedById: null },
    });

    // 3. Delete related refresh tokens & password reset tokens
    await tx.refreshToken.deleteMany({ where: { userId: id } });
    await tx.passwordResetToken.deleteMany({ where: { userId: id } });

    // 4. Delete the user
    return tx.user.delete({
      where: { id },
    });
  });
};

