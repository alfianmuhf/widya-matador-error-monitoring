import createError from "http-errors";
import * as authRepository from "./auth.repository.js";
import { hashPassword, comparePassword } from "../../utils/hash.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpiryDate,
} from "../../utils/jwt.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Register a new user
 */
export const register = async ({ email, password, name, role }) => {
  const existingUser = await authRepository.findUserByEmail(email);
  if (existingUser) {
    throw createError(409, "Email sudah terdaftar. Silakan gunakan email lain.");
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await authRepository.createUser({
    email,
    passwordHash: hashedPassword,
    name,
    role: role || "VIEWER",
    status: "ACTIVE",
    mustChangePassword: false,
  });

  return newUser;
};

/**
 * Authenticate user and issue access + refresh tokens
 * Includes Account Lockout Protection (FR-SEC-01/02)
 */
export const login = async ({ email, password }, { userAgent, ipAddress } = {}) => {
  const user = await authRepository.findUserByEmail(email);

  if (!user) {
    throw createError(401, "Email atau password salah");
  }

  // 1. Check if account is currently locked
  if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
    const remainingMinutes = Math.ceil((new Date(user.lockedUntil) - new Date()) / (60 * 1000));
    throw createError(
      423,
      `Akun terkunci sementara karena 5x percobaan login gagal. Silakan coba lagi dalam ${remainingMinutes} menit.`
    );
  }

  // 2. Check user status
  if (user.status === "SUSPENDED") {
    throw createError(403, "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.");
  }

  if (user.status === "INVITED" || !user.passwordHash) {
    throw createError(
      401,
      "Akun belum diaktifkan. Silakan setel password melalui link undangan terlebih dahulu."
    );
  }

  // 3. Verify password
  const isPasswordValid = await comparePassword(password, user.passwordHash);
  if (!isPasswordValid) {
    const currentAttempts = (user.failedLoginAttempts || 0) + 1;

    if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      await authRepository.recordFailedLoginAttempt(user.id, currentAttempts, lockedUntil);
      throw createError(
        423,
        `Akun Anda terkunci selama ${LOCKOUT_DURATION_MINUTES} menit karena 5 kali percobaan login gagal.`
      );
    } else {
      await authRepository.recordFailedLoginAttempt(user.id, currentAttempts);
      const remainingAttempts = MAX_FAILED_ATTEMPTS - currentAttempts;
      throw createError(
        401,
        `Email atau password salah. Sisa kesempatan login: ${remainingAttempts} kali.`
      );
    }
  }

  // 4. Successful login: reset lockout attempts & update lastLoginAt
  await authRepository.updateLoginSuccess(user.id);

  // 5. Issue Token Pair
  const accessTokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(accessTokenPayload);
  const refreshToken = generateRefreshToken({ id: user.id });
  const expiresAt = getTokenExpiryDate(refreshToken);

  // Store refresh token in database
  await authRepository.createRefreshToken({
    token: refreshToken,
    userId: user.id,
    expiresAt,
    userAgent: userAgent || null,
    ipAddress: ipAddress || null,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Refresh access token and rotate refresh token
 */
export const refreshToken = async (oldToken, { userAgent, ipAddress } = {}) => {
  if (!oldToken) {
    throw createError(401, "Refresh token tidak ditemukan");
  }

  // 1. Verify token signature
  let decoded;
  try {
    decoded = verifyRefreshToken(oldToken);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw createError(401, "Refresh token telah kedaluwarsa. Silakan login kembali.");
    }
    throw createError(401, "Refresh token tidak valid.");
  }

  // 2. Query token record from database
  const storedToken = await authRepository.findRefreshToken(oldToken);

  if (!storedToken) {
    throw createError(401, "Refresh token tidak dikenali dalam sistem");
  }

  // 3. Security: Check if token has been revoked (Token Reuse Detection)
  if (storedToken.revoked) {
    await authRepository.revokeAllUserTokens(storedToken.userId);
    throw createError(
      401,
      "Aktivitas mencurigakan terdeteksi (token reuse). Semua sesi aktif telah dicabut demi keamanan."
    );
  }

  // 4. Check database expiration
  if (new Date() > new Date(storedToken.expiresAt)) {
    throw createError(401, "Refresh token telah kedaluwarsa. Silakan login kembali.");
  }

  // 5. Ensure user exists and is active
  const user = storedToken.user;
  if (!user || user.status !== "ACTIVE") {
    throw createError(403, "User tidak aktif atau tidak ditemukan");
  }

  // 6. Token Rotation: Invalidate current refresh token
  await authRepository.revokeRefreshToken(oldToken);

  // 7. Generate new token pair
  const accessTokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const newAccessToken = generateAccessToken(accessTokenPayload);
  const newRefreshToken = generateRefreshToken({ id: user.id });
  const expiresAt = getTokenExpiryDate(newRefreshToken);

  // 8. Store the new refresh token
  await authRepository.createRefreshToken({
    token: newRefreshToken,
    userId: user.id,
    expiresAt,
    userAgent: userAgent || storedToken.userAgent || null,
    ipAddress: ipAddress || storedToken.ipAddress || null,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    },
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
};

/**
 * Logout user by revoking their refresh token
 */
export const logout = async (token) => {
  if (token) {
    try {
      await authRepository.revokeRefreshToken(token);
    } catch {
      // If token not found in DB or already revoked, continue quietly
    }
  }

  return { message: "Logout berhasil" };
};

/**
 * Retrieve current user profile
 */
export const getMe = async (userId) => {
  const user = await authRepository.findUserById(userId);

  if (!user) {
    throw createError(404, "Data pengguna tidak ditemukan");
  }

  return user;
};

/**
 * Change current user password
 */
export const changePassword = async (userId, { currentPassword, newPassword }, meta = {}) => {
  // 1. Retrieve user with current password hash
  const user = await authRepository.findUserWithPasswordById(userId);

  if (!user) {
    throw createError(404, "Data pengguna tidak ditemukan");
  }

  if (user.status === "SUSPENDED") {
    throw createError(403, "Akun Anda telah dinonaktifkan");
  }

  // 2. Verify current password
  if (!user.passwordHash) {
    throw createError(400, "Akun ini belum memiliki password terdaftar");
  }

  const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    throw createError(400, "Password saat ini tidak sesuai");
  }

  // 3. Ensure new password is not identical to current password
  const isSamePassword = await comparePassword(newPassword, user.passwordHash);
  if (isSamePassword) {
    throw createError(400, "Password baru tidak boleh sama dengan password saat ini");
  }

  // 4. Hash new password and update in database
  const newPasswordHash = await hashPassword(newPassword);
  const updatedUser = await authRepository.updateUserPassword(userId, newPasswordHash);

  // 5. Invalidate existing sessions on other devices for security
  await authRepository.revokeAllUserTokens(userId);

  // 6. Generate fresh active session token pair for current device
  const accessTokenPayload = {
    id: updatedUser.id,
    email: updatedUser.email,
    role: updatedUser.role,
  };

  const accessToken = generateAccessToken(accessTokenPayload);
  const refreshToken = generateRefreshToken({ id: updatedUser.id });
  const expiresAt = getTokenExpiryDate(refreshToken);

  await authRepository.createRefreshToken({
    token: refreshToken,
    userId: updatedUser.id,
    expiresAt,
    userAgent: meta.userAgent || null,
    ipAddress: meta.ipAddress || null,
  });

  return {
    user: updatedUser,
    accessToken,
    refreshToken,
  };
};

