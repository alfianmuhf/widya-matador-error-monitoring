import pino from "pino";
import { env } from "./env.js";

const isDev = env.NODE_ENV === "development";
const isTest = env.NODE_ENV === "test";

const redactOptions = {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    'req.headers["x-api-key"]',
    "req.body.password",
    "req.body.oldPassword",
    "req.body.newPassword",
    "req.body.refreshToken",
    "password",
    "oldPassword",
    "newPassword",
    "refreshToken",
    "token",
    "*.password",
  ],
  censor: "[REDACTED]",
};

export const logger = pino({
  level: isTest ? "silent" : env.LOG_LEVEL || "info",
  redact: redactOptions,
  transport: isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss.l",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: isDev ? undefined : { service: "error-service" },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;

