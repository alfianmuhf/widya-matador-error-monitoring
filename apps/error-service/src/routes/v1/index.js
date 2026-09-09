import { Router } from "express";
import authRoutes from "../../modules/auth/auth.route.js";

const router = Router();

/**
 * Health check endpoint for v1 API
 * GET /v1/health
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "error-service",
    version: "v1",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Modular Service Routes (v1)
 * Setiap service atau modul fungsional didaftarkan secara modular di sini.
 */
// Auth Service (/v1/auth)
router.use("/auth", authRoutes);

// Service lain di masa depan dapat ditambahkan di sini, misalnya:
// router.use("/errors", errorRoutes);
// router.use("/robots", robotRoutes);

export default router;
