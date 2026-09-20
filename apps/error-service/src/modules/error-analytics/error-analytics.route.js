import { Router } from "express";
import * as errorAnalyticsController from "./error-analytics.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

/**
 * GET /error-analytics
 * Aggregated error analytics metrics for ECharts
 */
router.get("/", authenticate, errorAnalyticsController.getErrorAnalytics);

export default router;
