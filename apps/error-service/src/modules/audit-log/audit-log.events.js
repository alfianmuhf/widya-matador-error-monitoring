import EventEmitter from "events";

class AuditLogEvents extends EventEmitter {
  /**
   * Broadcast newly created audit log to connected SSE clients
   * @param {object} log
   */
  notifyLogCreated(log) {
    this.emit("audit_log_event", {
      event: "log_created",
      data: log,
      timestamp: new Date().toISOString(),
    });
  }
}

export const auditLogEvents = new AuditLogEvents();
