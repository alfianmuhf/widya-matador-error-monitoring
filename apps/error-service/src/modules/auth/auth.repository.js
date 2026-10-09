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
 * Find user by ID (excluding password hash by selection)
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
      password_hash: data.password_hash || data.passwordHash,
      role: data.role || "viewer",
      division: data.division || null,
      status: data.status || "invited",
      must_change_password: data.must_change_password ?? data.mustChangePassword ?? true,
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
    },
  });
};

/**
 * Update user on successful login: reset failed attempts, clear lock, update last_login_at
 * @param {string} id
 */
export const updateLoginSuccess = async (id) => {
  return prisma.users.update({
    where: { id },
    data: {
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date(),
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
  return prisma.users.update({
    where: { id },
    data: {
      failed_login_attempts: attempts,
      ...(lockedUntil ? { locked_until: lockedUntil } : {}),
    },
  });
};

/**
 * Store a new refresh token in the database
 * @param {object} data
 */
export const createRefreshToken = async (data) => {
  return prisma.refresh_tokens.create({
    data: {
      token_hash: data.token_hash || data.token,
      user_id: data.user_id || data.userId,
      expires_at: data.expires_at || data.expiresAt,
      user_agent: data.user_agent || data.userAgent || null,
      ip_address: data.ip_address || data.ipAddress || null,
    },
  });
};

/**
 * Find refresh token along with its associated user
 * @param {string} token
 */
export const findRefreshToken = async (token) => {
  return prisma.refresh_tokens.findUnique({
    where: { token_hash: token },
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
  return prisma.refresh_tokens.update({
    where: { token_hash: token },
    data: {
      revoked_at: new Date(),
    },
  });
};

export const findLatestActiveRefreshToken = async (userId) => {
  return prisma.refresh_tokens.findFirst({
    where: {
      user_id: userId,
      revoked_at: null,
      expires_at: { gt: new Date() },
    },
    orderBy: { created_at: "desc" },
  });
};

/**
 * Revoke all active refresh tokens for a user (force logout all devices)
 * @param {string} userId
 */
export const revokeAllUserTokens = async (userId) => {
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
 * Find user by ID including password_hash for verification
 * @param {string} id
 */
export const findUserWithPasswordById = async (id) => {
  return prisma.users.findUnique({
    where: { id },
  });
};

/**
 * Update user password and mark must_change_password as false
 * @param {string} id
 * @param {string} passwordHash
 */
export const updateUserPassword = async (id, passwordHash) => {
  return prisma.users.update({
    where: { id },
    data: {
      password_hash: passwordHash,
      status: "active",
      must_change_password: false,
      password_changed_at: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      division: true,
      status: true,
      must_change_password: true,
      password_changed_at: true,
      updated_at: true,
    },
  });
};
