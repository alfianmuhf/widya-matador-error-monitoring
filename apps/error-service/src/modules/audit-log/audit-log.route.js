import { Router } from "express";
import * as auditLogController from "./audit-log.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";

const router = Router();

/**
 * GET /audit-logs/stream
 * Realtime Server-Sent Events (SSE) stream for audit logs
 */
router.get("/stream", authenticate, auditLogController.streamAuditLogs);

/**
 * GET /audit-logs
 * View audit logs for all authenticated roles
 */
router.get("/", authenticate, auditLogController.getAuditLogs);

/**
 * GET /audit-logs/:id
 */
router.get("/:id", authenticate, auditLogController.getAuditLogById);

export default router;
