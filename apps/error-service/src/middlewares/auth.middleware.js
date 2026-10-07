import createError from "http-errors";
import { verifyAccessToken } from "../utils/jwt.js";

/**
 * Middleware to authenticate requests using JWT Access Token in Authorization header
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      throw createError(401, "Akses ditolak: Access token tidak ditemukan atau format tidak valid");
    }

    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
      next();
    } catch (tokenError) {
      if (tokenError.name === "TokenExpiredError") {
        throw createError(401, "Access token telah kedaluwarsa");
      }
      throw createError(401, "Access token tidak valid");
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to restrict access based on user role
 * @param  {...string} roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, "Autentikasi diperlukan"));
    }

    const userRole = (req.user.role || "").toLowerCase();
    const allowedRoles = roles.map((r) => r.toLowerCase());

    if (!allowedRoles.includes(userRole)) {
      return next(createError(403, "Akses dilarang: Peran tidak memiliki izin yang cukup"));
    }

    next();
  };
};
