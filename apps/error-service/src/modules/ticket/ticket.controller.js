import * as ticketService from "./ticket.service.js";
import * as ticketRepo from "./ticket.repository.js";
import { ticketEvents } from "./ticket.events.js";

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
 * GET /tickets/:id/history
 * Get ticket history records by ticketId
 */
export const getTicketHistory = async (req, res, next) => {
  try {
    const history = await ticketService.getTicketHistory(req.params.id, req.query);
    res.status(200).json({
      success: true,
      message: "Riwayat tiket berhasil diambil",
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tickets/:id/history/:version
 * Get specific version detail of ticket history
 */
export const getTicketHistoryDetail = async (req, res, next) => {
  try {
    const detail = await ticketService.getTicketHistoryDetail(req.params.id, req.params.version);
    res.status(200).json({
      success: true,
      message: `Detail riwayat tiket versi ${req.params.version} berhasil diambil`,
      data: detail,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /tickets/:id/assignees
 * Get list of software team members assigned to this ticket
 */
export const getTicketAssignees = async (req, res, next) => {
  try {
    const assignees = await ticketService.getTicketAssignees(req.params.id);
    res.status(200).json({
      success: true,
      message: "Daftar assignees tiket berhasil diambil",
      data: assignees,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /tickets/:id/claim
 * Software team member claims ticket (first claim becomes Leader)
 */
export const claimTicket = async (req, res, next) => {
  try {
    const actor = {
      ...(req.user || {}),
      ...(req.body || {}),
    };
    const ticket = await ticketService.claimTicket(req.params.id, actor);
    res.status(200).json({
      success: true,
      message: "Tiket berhasil diklaim sebagai Leader tim Software",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /tickets/:id/assignees
 * Add member to ticket_assignees (only leader can do this)
 */
export const addAssignee = async (req, res, next) => {
  try {
    const result = await ticketService.addAssignee(req.params.id, req.body, req.user);
    res.status(201).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /tickets/:id/assignees/:assigneeId
 * Update / edit member in ticket_assignees (only leader can do this)
 */
export const updateAssignee = async (req, res, next) => {
  try {
    const result = await ticketService.updateAssignee(
      req.params.id,
      req.params.assigneeId,
      req.body,
      req.user
    );
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /tickets/:id/leader
 * Transfer leader to another assignee
 */
export const changeLeader = async (req, res, next) => {
  try {
    const ticket = await ticketService.changeLeader(req.params.id, req.body, req.user);
    res.status(200).json({
      success: true,
      message: "Leader tim tiket berhasil dialihkan",
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /tickets/:id/assignees/:assigneeId
 * Remove an assignee from ticket
 */
export const removeAssignee = async (req, res, next) => {
  try {
    const result = await ticketService.removeAssignee(req.params.id, req.params.assigneeId, req.user);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
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
    openTicketsCount = await ticketRepo.countOpenTickets();
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
      freshOpenCount = await ticketRepo.countOpenTickets();
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
