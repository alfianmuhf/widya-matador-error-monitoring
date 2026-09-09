import { Router } from "express";
import v1Routes from "./v1/index.js";

const router = Router();

/**
 * Health check endpoint root (unversioned)
 * Berguna untuk health probe container, orchestrator, atau load balancer
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "error-service",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Modular API Versioning
 * Tiap service atau kelompok endpoint memiliki versinya masing-masing secara modular.
 * 
 * Contoh:
 * - Error Service API v1 (Auth, Errors, dsb): /v1/...
 * - Jika nantinya ada service atau modul yang mengadopsi v2: /v2/...
 */
router.use("/v1", v1Routes);

// Modular service version lain di masa depan dapat didaftarkan di sini:
// router.use("/v2", v2Routes);

export default router;

