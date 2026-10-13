import createError from "http-errors";
import * as authRepository from "./auth.repository.js";
import { hashPassword, comparePassword } from "../../utils/hash.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  getTokenExpiryDate,
} from "../../utils/jwt.js";
import { publish as publishWebhook } from "../webhook/webhook.publisher.js";
import { getTelegramLink, createOtp, verifyOtp } from "./otp.store.js";
import { recordLog } from "../audit-log/audit-log.service.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

/**
 * Register a new user
 */
export const register = async ({ email, password, name, role, division }) => {
  const existingUser = await authRepository.findUserByEmail(email);
  if (existingUser) {
    throw createError(409, "Email sudah terdaftar. Silakan gunakan email lain.");
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await authRepository.createUser({
    email,
    password_hash: hashedPassword,
    name,
    role: role ? role.toLowerCase() : "viewer",
    division: division || null,
    status: "active",
    must_change_password: false,
  });

  await recordLog({
    actor: newUser.email,
    actorUserId: newUser.id,
    action: "CREATE",
    deleteAction: "NONE",
    entityType: "User",
    entityId: newUser.id,
    details: {
      identifier: newUser.email,
      changeSummary: `Registrasi akun baru '${newUser.name}' (${newUser.role})`,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      division: newUser.division,
    },
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
  const lockedUntil = user.locked_until || user.lockedUntil;
  if (lockedUntil && new Date() < new Date(lockedUntil)) {
    const remainingMinutes = Math.ceil((new Date(lockedUntil) - new Date()) / (60 * 1000));
    throw createError(
      423,
      `Akun terkunci sementara karena 5x percobaan login gagal. Silakan coba lagi dalam ${remainingMinutes} menit.`
    );
  }

  // 2. Check user status
  const status = (user.status || "").toLowerCase();
  if (status === "suspended") {
    throw createError(403, "Akun Anda telah dinonaktifkan. Silakan hubungi administrator.");
  }

  const passwordHash = user.password_hash || user.passwordHash;
  if (!passwordHash) {
    throw createError(
      401,
      "Akun belum memiliki password terdaftar. Silakan hubungi administrator."
    );
  }

  // 3. Verify password
  const isPasswordValid = await comparePassword(password, passwordHash);
  if (!isPasswordValid) {
    const currentAttempts = (user.failed_login_attempts ?? user.failedLoginAttempts ?? 0) + 1;

    if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockDate = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
      await authRepository.recordFailedLoginAttempt(user.id, currentAttempts, lockDate);
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

  // 4. Successful login: reset lockout attempts & update last_login_at
  await authRepository.updateLoginSuccess(user.id);

  // 5. Issue Token Pair
  const accessTokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    division: user.division,
  };

  const accessToken = generateAccessToken(accessTokenPayload);
  const refreshToken = generateRefreshToken({ id: user.id });
  const expiresAt = getTokenExpiryDate(refreshToken);

  // Store refresh token in database
  await authRepository.createRefreshToken({
    token_hash: refreshToken,
    user_id: user.id,
    expires_at: expiresAt,
    user_agent: userAgent || null,
    ip_address: ipAddress || null,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      division: user.division,
      status: user.status,
      mustChangePassword: user.must_change_password ?? user.mustChangePassword,
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

  const userId = storedToken.user_id || storedToken.userId;

  // 3. Security: Check if token has been revoked (Token Reuse Detection with Grace Period)
  if (storedToken.revoked_at || storedToken.revoked) {
    const revokedAt = new Date(storedToken.revoked_at || storedToken.revoked);
    const diffMs = Date.now() - revokedAt.getTime();
    const GRACE_PERIOD_MS = 20 * 1000; // 20s grace period for concurrent network/tab requests

    if (diffMs <= GRACE_PERIOD_MS) {
      // Find the latest active token for this user (issued during the rotation)
      const latestToken = await authRepository.findLatestActiveRefreshToken(userId);
      const user = storedToken.user;
      const status = (user?.status || "").toLowerCase();

      if (latestToken && user && (status === "active" || status === "invited")) {
        const accessTokenPayload = {
          id: user.id,
          email: user.email,
          role: user.role,
          division: user.division,
        };
        const newAccessToken = generateAccessToken(accessTokenPayload);

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            division: user.division,
            status: user.status,
            mustChangePassword: user.must_change_password ?? user.mustChangePassword,
          },
          accessToken: newAccessToken,
          refreshToken: latestToken.token_hash,
        };
      }
    }

    // Token reuse detected outside of grace period — revoke all sessions
    await authRepository.revokeAllUserTokens(userId);
    throw createError(
      401,
      "Aktivitas mencurigakan terdeteksi (token reuse). Semua sesi aktif telah dicabut demi keamanan."
    );
  }

  // 4. Check database expiration
  const expiresAtDate = storedToken.expires_at || storedToken.expiresAt;
  if (new Date() > new Date(expiresAtDate)) {
    throw createError(401, "Refresh token telah kedaluwarsa. Silakan login kembali.");
  }

  // 5. Ensure user exists and is active or invited
  const user = storedToken.user;
  const status = (user?.status || "").toLowerCase();
  if (!user || (status !== "active" && status !== "invited")) {
    throw createError(403, "User tidak aktif atau tidak ditemukan");
  }

  // 6. Token Rotation: Invalidate current refresh token
  await authRepository.revokeRefreshToken(oldToken);

  // 7. Generate new token pair
  const accessTokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    division: user.division,
  };

  const newAccessToken = generateAccessToken(accessTokenPayload);
  const newRefreshToken = generateRefreshToken({ id: user.id });
  const expiresAt = getTokenExpiryDate(newRefreshToken);

  // 8. Store the new refresh token
  await authRepository.createRefreshToken({
    token_hash: newRefreshToken,
    user_id: user.id,
    expires_at: expiresAt,
    user_agent: userAgent || storedToken.user_agent || storedToken.userAgent || null,
    ip_address: ipAddress || storedToken.ip_address || storedToken.ipAddress || null,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      division: user.division,
      status: user.status,
      mustChangePassword: user.must_change_password ?? user.mustChangePassword,
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

  const status = (user.status || "").toLowerCase();
  if (status === "suspended") {
    throw createError(403, "Akun Anda telah dinonaktifkan");
  }

  // 2. Verify current password
  const passwordHash = user.password_hash || user.passwordHash;
  if (!passwordHash) {
    throw createError(400, "Akun ini belum memiliki password terdaftar");
  }

  if (currentPassword) {
    const isCurrentPasswordValid = await comparePassword(currentPassword, passwordHash);
    if (!isCurrentPasswordValid) {
      throw createError(400, "Password saat ini tidak sesuai");
    }
  } else if (!user.must_change_password && status !== "invited") {
    throw createError(400, "Password saat ini wajib diisi");
  }

  // 3. Ensure new password is not identical to current password
  const isSamePassword = await comparePassword(newPassword, passwordHash);
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
    division: updatedUser.division,
  };

  const accessToken = generateAccessToken(accessTokenPayload);
  const refreshToken = generateRefreshToken({ id: updatedUser.id });
  const expiresAt = getTokenExpiryDate(refreshToken);

  await authRepository.createRefreshToken({
    token_hash: refreshToken,
    user_id: updatedUser.id,
    expires_at: expiresAt,
    user_agent: meta.userAgent || null,
    ip_address: meta.ipAddress || null,
  });

  await recordLog({
    actor: updatedUser.email || updatedUser.name || "User",
    actorUserId: updatedUser.id,
    action: "UPDATE",
    deleteAction: "NONE",
    entityType: "User",
    entityId: updatedUser.id,
    details: {
      identifier: updatedUser.email,
      changeSummary: "Ubah kata sandi akun pengguna",
      action: "change_password",
    },
    ipAddress: meta.ipAddress || null,
  });

  return {
    user: updatedUser,
    accessToken,
    refreshToken,
  };
};

/**
 * Lupa password: kirim OTP 6 digit ke Telegram yang terlink (in-memory).
 * Respons SELALU generik — tidak membocorkan apakah email terdaftar.
 */
export const forgotPassword = async ({ email }) => {
  const link = getTelegramLink(email);
  if (link?.telegramId) {
    const otp = createOtp(email);
    publishWebhook("otp.password_reset", {
      data: {
        telegram: link,
        otp,
        expiresInMinutes: 5,
      },
    });
  }
  return { message: "Jika terdaftar, OTP terkirim ke Telegram Anda." };
};

/**
 * Reset password via OTP: verifikasi OTP sekali pakai → update hash →
 * clear lockout → revoke semua refresh token (paksa login ulang).
 */
export const resetPassword = async ({ email, otp, newPassword }) => {
  const check = verifyOtp(email, otp);
  if (!check.ok) {
    const errors = {
      wrong: [401, "OTP salah. Periksa kembali kode dari Telegram."],
      too_many: [401, "Terlalu banyak percobaan. OTP dibatalkan, minta OTP baru."],
      expired: [401, "OTP kedaluwarsa. Silakan minta OTP baru."],
      not_found: [400, "OTP tidak valid atau sudah kedaluwarsa."],
    };
    const [status, message] = errors[check.reason];
    throw createError(status, message);
  }

  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw createError(404, "Data pengguna tidak ditemukan");
  }

  const hashedPassword = await hashPassword(newPassword);
  await authRepository.resetPasswordWithOtp(user.id, hashedPassword, user.status === "invited");
  await authRepository.revokeAllUserTokens(user.id);

  await recordLog({
    actor: user.email || user.name || "User",
    actorUserId: user.id,
    action: "UPDATE",
    deleteAction: "NONE",
    entityType: "User",
    entityId: user.id,
    details: {
      identifier: user.email,
      changeSummary: "Reset kata sandi pengguna melalui verifikasi OTP Telegram",
      action: "reset_password_otp",
    },
  });

  return { message: "Password berhasil direset. Silakan login dengan password baru." };
};

