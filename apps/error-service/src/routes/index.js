import { Router } from "express";
import authRoutes from "../modules/auth/auth.route.js";
import userRoutes from "../modules/user/user.route.js";

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

// Service lain di masa depan:
// router.use("/errors", errorRoutes);
// router.use("/robots", robotRoutes);

export default router;
