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
 * Find user by ID (excluding password hash by selection)
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
    },
  });
};

/**
 * Create a new user record
 * @param {object} data - { email, passwordHash, name, role, status, mustChangePassword }
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
      createdAt: true,
    },
  });
};

/**
 * Update user on successful login: reset failed attempts, clear lock, update lastLoginAt
 * @param {string} id
 */
export const updateLoginSuccess = async (id) => {
  return prisma.user.update({
    where: { id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
  });
};

/**
 * Record failed login attempt and optionally lock the account
 * @param {string} id
 * @param {number} attempts
 * @param {Date|null} lockedUntil
 */
export const recordFailedLoginAttempt = async (id, attempts, lockedUntil = null) => {
  return prisma.user.update({
    where: { id },
    data: {
      failedLoginAttempts: attempts,
      ...(lockedUntil ? { lockedUntil } : {}),
    },
  });
};

/**
 * Store a new refresh token in the database
 * @param {object} data - { token, userId, expiresAt, userAgent, ipAddress }
 */
export const createRefreshToken = async (data) => {
  return prisma.refreshToken.create({
    data,
  });
};

/**
 * Find refresh token along with its associated user
 * @param {string} token
 */
export const findRefreshToken = async (token) => {
  return prisma.refreshToken.findUnique({
    where: { token },
    include: {
      user: true,
    },
  });
};

/**
 * Mark a refresh token as revoked
 * @param {string} token
 */
export const revokeRefreshToken = async (token) => {
  return prisma.refreshToken.update({
    where: { token },
    data: {
      revoked: true,
      revokedAt: new Date(),
    },
  });
};

/**
 * Revoke all active refresh tokens for a user (useful for security breach / force logout all devices)
 * @param {string} userId
 */
export const revokeAllUserTokens = async (userId) => {
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
