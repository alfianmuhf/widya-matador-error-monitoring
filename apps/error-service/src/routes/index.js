import { Router } from "express";
import authRoutes from "../modules/auth/auth.route.js";

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
 * Contoh: /auth/login, /auth/register, /auth/me, dsb.
 */
router.use("/auth", authRoutes);

// Service lain di masa depan dapat didaftarkan langsung di sini:
// router.use("/errors", errorRoutes);
// router.use("/robots", robotRoutes);

export default router;
