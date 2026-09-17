import { Router } from "express";
import authRoutes from "../modules/auth/auth.route.js";
import userRoutes from "../modules/user/user.route.js";
import telegramRoutes from "../modules/telegram/telegram.route.js";
import clientRoutes from "../modules/client/client.route.js";
import locationRoutes from "../modules/location/location.route.js";
import componentRoutes from "../modules/component/component.route.js";
import failureCodeRoutes from "../modules/failure-code/failure-code.route.js";
import assetRoutes from "../modules/asset/asset.route.js";

const router = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "error-service",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Modular Service Routes (Direct / Unversioned)
 */
// Auth Service (/auth/login, /auth/register, /auth/refresh, /auth/logout, /auth/me)
router.use("/auth", authRoutes);

// User Management Service (/users)
router.use("/users", userRoutes);

// Telegram User Whitelist Service (/telegram-users)
router.use("/telegram-users", telegramRoutes);

// Master Data Services
router.use("/clients", clientRoutes);
router.use("/locations", locationRoutes);
router.use("/components", componentRoutes);
router.use("/failure-codes", failureCodeRoutes);
router.use("/assets", assetRoutes);

export default router;
