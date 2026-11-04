import createError from "http-errors";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

/**
 * 404 Not Found handler for undefined routes
 */
export const notFoundHandler = (req, res, next) => {
  next(createError(404, `Route ${req.method} ${req.originalUrl} tidak ditemukan`));
};

/**
 * Global Centralized Error Handler
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Terjadi kesalahan internal pada server";
  let details = err.details || null;

  // Handle express.json() JSON parse syntax error
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    statusCode = 400;
    message = "Format JSON body tidak valid";
  }

  // Handle Prisma Database Errors
  if (err.code === "P2002") {
    statusCode = 409;
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(", ") : err.meta?.target || "field";
    message = `Data dengan ${target} tersebut sudah terdaftar`;
  } else if (err.code === "P2025") {
    statusCode = 404;
    message = err.meta?.cause || "Data yang dicari tidak ditemukan";
  }

  // Log 500 or unexpected server errors menggunakan pino
  if (statusCode >= 500) {
    const logInstance = req.log || logger;
    logInstance.error(
      {
        err,
        statusCode,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
      },
      `[SERVER ERROR] ${req.method} ${req.originalUrl}: ${err.message}`
    );
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(details ? { details } : {}),
    ...(env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};
