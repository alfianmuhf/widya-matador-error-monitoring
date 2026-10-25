import { Router } from "express";
import authRoutes from "../modules/auth/auth.route.js";
import userRoutes from "../modules/user/user.route.js";
import whitelistTelegramRoutes from "../modules/whitelist-telegram/whitelist-telegram.route.js";
import clientRoutes from "../modules/client/client.route.js";

import locationRoutes from "../modules/location/location.route.js";
import componentRoutes from "../modules/component/component.route.js";
import failureCodeRoutes from "../modules/failure-code/failure-code.route.js";
import assetRoutes from "../modules/asset/asset.route.js";
import ticketRoutes from "../modules/ticket/ticket.route.js";
import ticketManagementRoutes from "../modules/ticket-management/ticket-management.route.js";
import exportRoutes from "../modules/export/export.route.js";
import auditLogRoutes from "../modules/audit-log/audit-log.route.js";
import summaryRoutes from "../modules/summary/summary.route.js";
import errorAnalyticsRoutes from "../modules/error-analytics/error-analytics.route.js";
import teamRoutes from "../modules/team/team.route.js";

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

// Telegram User Whitelist Service (/telegram-users & /whitelist-telegram)
router.use("/telegram-users", whitelistTelegramRoutes);
router.use("/whitelist-telegram", whitelistTelegramRoutes);

// Master Data Services
router.use("/clients", clientRoutes);
router.use("/locations", locationRoutes);
router.use("/components", componentRoutes);
router.use("/failure-codes", failureCodeRoutes);
router.use("/assets", assetRoutes);

// Team Management Service (/teams)
router.use("/teams", teamRoutes);

// Ticket Service (/tickets)
router.use("/tickets", ticketRoutes);

// Ticket Management Service khusus Coordinator (/ticket-management)
router.use("/ticket-management", ticketManagementRoutes);

// Export Service (/exports)
router.use("/exports", exportRoutes);

// Audit Log Service (/audit-logs)
router.use("/audit-logs", auditLogRoutes);

// Dashboard Summary Service (/summary & /ringkasan)
router.use("/summary", summaryRoutes);
router.use("/ringkasan", summaryRoutes);

// Error Analytics Service (/error-analytics & /analytics)
router.use("/error-analytics", errorAnalyticsRoutes);
router.use("/analytics", errorAnalyticsRoutes);

export default router;
