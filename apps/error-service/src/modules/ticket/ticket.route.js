import { Router } from "express";
import * as ticketController from "./ticket.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  queryTicketsSchema,
  updateTicketSchema,
  addCommentSchema,
  createTicketSchema,
} from "./ticket.schema.js";

import { exportTicketsExcel, exportTicketsPdf } from "../export/export.controller.js";

const router = Router();

/**
 * GET /tickets/stream
 * Server-Sent Events (SSE) stream for real-time ticket updates
 * Supports ?token=<accessToken> or Authorization: Bearer <token>
 */
router.get("/stream", authenticate, ticketController.streamTickets);

/**
 * GET /tickets/export/excel
 * Download Excel report of tickets
 */
router.get("/export/excel", authenticate, exportTicketsExcel);

/**
 * GET /tickets/export/pdf
 * Download PDF report of tickets
 */
router.get("/export/pdf", authenticate, exportTicketsPdf);

/**
 * GET /tickets
 * Paginated and filtered ticket list
 */
router.get(
  "/",
  authenticate,
  validate(queryTicketsSchema, "query"),
  ticketController.getTickets
);

/**
 * GET /tickets/:id
 * Detail ticket by ID with attachments and history
 */
router.get("/:id", authenticate, ticketController.getTicketById);

/**
 * PATCH /tickets/:id
 * Update status, handling note, or other ticket data
 */
router.patch(
  "/:id",
  authenticate,
  validate(updateTicketSchema, "body"),
  ticketController.updateTicket
);

/**
 * POST /tickets/:id/comments
 * Add comment / handling note specifically
 */
router.post(
  "/:id/comments",
  authenticate,
  validate(addCommentSchema, "body"),
  ticketController.addComment
);

/**
 * POST /tickets
 * Create new ticket from dashboard (all authenticated roles)
 */
router.post(
  "/",
  authenticate,
  validate(createTicketSchema, "body"),
  ticketController.createTicket
);

export default router;
