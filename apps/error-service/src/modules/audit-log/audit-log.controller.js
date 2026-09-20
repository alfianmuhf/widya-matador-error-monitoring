import * as auditLogService from "./audit-log.service.js";
import { auditLogEvents } from "./audit-log.events.js";

/**
 * GET /audit-logs
 * List audit logs with pagination and filters
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditLogService.getAuditLogs(req.query);
    res.status(200).json({
      success: true,
      message: "Daftar audit log berhasil diambil",
      data: result.logs,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /audit-logs/stream
 * Server-Sent Events (SSE) endpoint for realtime audit log updates
 */
export const streamAuditLogs = (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const initPayload = {
    connected: true,
    message: "Terhubung ke stream real-time Audit Log (SSE)",
    timestamp: new Date().toISOString(),
  };
  res.write(`event: init\ndata: ${JSON.stringify(initPayload)}\n\n`);

  const onAuditLog = ({ event, data, timestamp }) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify({ ...data, _streamTimestamp: timestamp })}\n\n`);
  };

  auditLogEvents.on("audit_log_event", onAuditLog);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    auditLogEvents.off("audit_log_event", onAuditLog);
  });
};

/**
 * GET /audit-logs/:id
 * Get single audit log detail
 */
export const getAuditLogById = async (req, res, next) => {
  try {
    const log = await auditLogService.getAuditLogById(req.params.id);
    res.status(200).json({
      success: true,
      message: "Detail audit log berhasil diambil",
      data: log,
    });
  } catch (error) {
    next(error);
  }
};
