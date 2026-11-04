import { randomUUID } from "node:crypto";
import pinoHttp from "pino-http";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existingId = req.id || req.headers["x-request-id"];
    if (existingId) return existingId;
    const id = randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    // Jika path /health, gunakan trace agar tidak memenuhi log Docker
    if (req.url === "/health" || req.url === "/") return "trace";
    return "info";
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} -> ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed with ${res.statusCode}: ${err.message}`;
  },
  autoLogging: {
    ignore: (req) => {
      // Dalam mode test, matikan logging otomatis
      if (env.NODE_ENV === "test") return true;
      // Abaikan healthcheck jika diinginkan
      if (req.url === "/health") return true;
      return false;
    },
  },
});

export default httpLogger;

