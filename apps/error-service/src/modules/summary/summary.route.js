import { Router } from "express";
import * as summaryController from "./summary.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

/**
 * GET /summary or /ringkasan
 * Aggregated summary dashboard metrics
 */
router.get("/", authenticate, summaryController.getSummary);

export default router;
