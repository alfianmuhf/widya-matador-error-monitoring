import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env.js";

/**
 * Generate Access Token (short-lived)
 * @param {object} payload - { id, email, role }
 * @returns {string} JWT access token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

/**
 * Verify Access Token
 * @param {string} token
 * @returns {object} decoded payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Generate Refresh Token (long-lived)
 * @param {object} payload - { id }
 * @returns {string} JWT refresh token
 */
export const generateRefreshToken = (payload) => {
  // Add a unique jti (JWT ID) so every generated token is distinct even if issued at the same second
  const tokenPayload = {
    ...payload,
    jti: crypto.randomUUID(),
  };

  return jwt.sign(tokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
};

/**
 * Verify Refresh Token
 * @param {string} token
 * @returns {object} decoded payload
 */
export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};

/**
 * Decode token without verifying
 * @param {string} token
 * @returns {object|null}
 */
export const decodeToken = (token) => {
  return jwt.decode(token);
};

/**
 * Get expiration Date from a JWT
 * @param {string} token
 * @returns {Date}
 */
export const getTokenExpiryDate = (token) => {
  const decoded = decodeToken(token);
  if (decoded && decoded.exp) {
    return new Date(decoded.exp * 1000);
  }
  // Default to 1 day if exp is not present
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
};
