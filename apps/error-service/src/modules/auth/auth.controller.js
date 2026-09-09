import { env } from "../../config/env.js";
import * as authService from "./auth.service.js";

const REFRESH_TOKEN_COOKIE = "refreshToken";

/**
 * Common cookie options for refresh token
 */
const getRefreshTokenCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 24 * 60 * 60 * 1000, // 1 day
  path: "/",
});

/**
 * Helper to extract device info
 */
const getClientMeta = (req) => ({
  userAgent: req.headers["user-agent"] || null,
  ipAddress: req.ip || req.socket?.remoteAddress || null,
});

/**
 * Controller: Register new user
 */
export const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: "Registrasi akun berhasil",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: User login
 */
export const login = async (req, res, next) => {
  try {
    const meta = getClientMeta(req);
    const { user, accessToken, refreshToken } = await authService.login(req.body, meta);

    // Set refresh token in HttpOnly cookie
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, getRefreshTokenCookieOptions());

    res.status(200).json({
      success: true,
      message: "Login berhasil",
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Refresh access token (with token rotation)
 */
export const refreshToken = async (req, res, next) => {
  try {
    // Read refresh token primarily from cookie, fallback to request body
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;
    const meta = getClientMeta(req);

    const { user, accessToken, refreshToken: newRefreshToken } = await authService.refreshToken(
      token,
      meta
    );

    // Set updated refresh token cookie
    res.cookie(REFRESH_TOKEN_COOKIE, newRefreshToken, getRefreshTokenCookieOptions());

    res.status(200).json({
      success: true,
      message: "Access token berhasil diperbarui",
      data: {
        user,
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Logout user
 */
export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;

    await authService.logout(token);

    // Clear refresh token cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: env.NODE_ENV === "production" ? "strict" : "lax",
      path: "/",
    });

    res.status(200).json({
      success: true,
      message: "Logout berhasil",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller: Get logged-in user profile
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
