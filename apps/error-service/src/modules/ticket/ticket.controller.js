import * as ticketService from "./ticket.service.js";
import { ticketEvents } from "./ticket.events.js";
import prisma from "../../config/prisma.js";

/**
 * GET /tickets
 * List tickets with filtering, search, and pagination
 */
export const getTickets = async (req, res, next) => {
  try {
    const result = await ticketService.getTickets(req.query);
    res.status(200).json({
      success: true,
      message: "Data tiket berhasil diambil",
      data: result.tickets,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tickets/:id
 * Get ticket detail by ticketId
 */
export const getTicketById = async (req, res, next) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id);
    res.status(200).json({
      success: true,
      message: "Detail tiket berhasil diambil",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /tickets/:id
 * Update ticket status, handling notes, or other fields
 */
export const updateTicket = async (req, res, next) => {
  try {
    const updated = await ticketService.updateTicket(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: "Status dan catatan tiket berhasil diperbarui",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /tickets/:id/comments
 * Add comment / handling note to ticket
 */
export const addComment = async (req, res, next) => {
  try {
    const updated = await ticketService.addComment(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: "Catatan penanganan berhasil ditambahkan",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /tickets
 * Create a new ticket (from Dashboard or coordinator)
 */
export const createTicket = async (req, res, next) => {
  try {
    const created = await ticketService.createTicket(req.body, req.user);
    res.status(201).json({
      success: true,
      message: "Tiket baru berhasil dibuat",
      data: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tickets/stream
 * Server-Sent Events (SSE) endpoint for real-time ticket updates and live open count
 */
export const streamTickets = async (req, res) => {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable proxy buffering (Nginx)

  // Flush headers immediately if supported
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  let openTicketsCount = 0;
  try {
    openTicketsCount = await prisma.ticket.count({ where: { status: "open" } });
  } catch (err) {
    console.error("Error counting open tickets for SSE init:", err);
  }

  // Send initial event
  const initPayload = {
    connected: true,
    message: "Terhubung ke stream real-time tiket (SSE)",
    openTicketsCount,
    timestamp: new Date().toISOString(),
  };
  res.write(`event: init\ndata: ${JSON.stringify(initPayload)}\n\n`);

  // Event listener callback
  const onTicketEvent = async ({ event, data, timestamp }) => {
    let freshOpenCount = undefined;
    try {
      freshOpenCount = await prisma.ticket.count({ where: { status: "open" } });
    } catch {}

    res.write(
      `event: ${event}\ndata: ${JSON.stringify({ ...data, openTicketsCount: freshOpenCount, _streamTimestamp: timestamp })}\n\n`
    );
  };

  ticketEvents.on("ticket_event", onTicketEvent);

  // Heartbeat ping every 25 seconds to keep connection alive through NAT / firewalls
  const heartbeatTimer = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 25000);

  // Cleanup when client disconnects
  req.on("close", () => {
    clearInterval(heartbeatTimer);
    ticketEvents.off("ticket_event", onTicketEvent);
    res.end();
  });
};
