import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFoundHandler, errorHandler } from "./middlewares/error.middleware.js";
import { httpLogger } from "./middlewares/logging.middleware.js";
import { globalLimiter } from "./middlewares/rate-limiter.middleware.js";

const app = express();

// Disable X-Powered-By header to prevent server fingerprinting
app.disable("x-powered-by");

// Di belakang reverse proxy, req.ip harus dibaca dari X-Forwarded-For
app.set("trust proxy", env.NODE_ENV === "production" ? 1 : false);

// 1. HTTP Request Logger (Pino HTTP) - disematkan paling awal untuk menyematkan req.id
app.use(httpLogger);

// Allowed origins for CORS (dikonfigurasi dari env CORS_ORIGINS atau FRONTEND_URL, pisahkan dengan koma)
const rawCors = env.CORS_ORIGINS || env.FRONTEND_URL || "http://localhost:5173,http://localhost";
const allowedOrigins = rawCors
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// Enable Cross-Origin Resource Sharing (CORS) with credentials support
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (
        env.NODE_ENV === "development" ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      callback(new Error(`Akses diblokir oleh kebijakan CORS untuk origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
  })
);

// 2. Global Rate Limiter (Proteksi DoS dasar untuk seluruh API)
app.use(globalLimiter);

// Security Headers (Defense in depth)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Standard parsers with body size limits to prevent DoS
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Base route
app.get("/", (req, res) => {
  res.status(200).json({
    name: "ROS Error Monitoring API",
    version: "1.0.0",
    status: "running",
  });
});

// Mount all modular routes directly (/health, /auth, etc.)
app.use(routes);

// 404 Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
