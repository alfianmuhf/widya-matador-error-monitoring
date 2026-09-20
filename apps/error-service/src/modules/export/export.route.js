import { Router } from "express";
import * as exportController from "./export.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

/**
 * GET /exports/excel
 * Download Excel report of tickets
 */
router.get("/excel", authenticate, exportController.exportTicketsExcel);

/**
 * GET /exports/pdf
 * Download PDF report of tickets
 */
router.get("/pdf", authenticate, exportController.exportTicketsPdf);

export default router;
