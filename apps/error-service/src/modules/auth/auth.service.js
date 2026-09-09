import createError from "http-errors";
import * as authRepository from "./auth.repository.js";
import { hashPassword, comparePassword } from "../../utils/hash.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpiryDate,
} from "../../utils/jwt.js";

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
    password: hashedPassword,
    name,
    role: role || "USER",
  });

  return newUser;
};

/**
 * Authenticate user and issue access + refresh tokens
 */
export const login = async ({ email, password }, { userAgent, ipAddress } = {}) => {
  const user = await authRepository.findUserByEmail(email);

  if (!user) {
    throw createError(401, "Email atau password salah");
  }

  if (!user.isActive) {
    throw createError(403, "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.");
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw createError(401, "Email atau password salah");
  }

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
    // If a revoked token is used again, someone might be replaying tokens!
    // Invalidate ALL tokens for this user as a safeguard.
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
  if (!user || !user.isActive) {
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
