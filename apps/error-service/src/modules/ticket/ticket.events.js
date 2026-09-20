import { EventEmitter } from "events";

/**
 * Global EventEmitter instance for Ticket realtime events (SSE)
 */
class TicketEventEmitter extends EventEmitter {
  constructor() {
    super();
    // Allow large number of concurrent SSE connections without memory leak warnings
    this.setMaxListeners(500);
  }

  notifyTicketUpdated(ticket) {
    this.emit("ticket_event", {
      event: "ticket_updated",
      data: ticket,
      timestamp: new Date().toISOString(),
    });
  }

  notifyTicketCreated(ticket) {
    this.emit("ticket_event", {
      event: "ticket_created",
      data: ticket,
      timestamp: new Date().toISOString(),
    });
  }

  notifyTicketComment(ticketId, comment) {
    this.emit("ticket_event", {
      event: "ticket_comment_added",
      data: { ticketId, comment },
      timestamp: new Date().toISOString(),
    });
  }
}

export const ticketEvents = new TicketEventEmitter();
