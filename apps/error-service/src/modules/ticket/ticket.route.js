import { Router } from "express";
import * as ticketController from "./ticket.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  queryTicketsSchema,
  updateTicketSchema,
  addCommentSchema,
  createTicketSchema,
  addAssigneeSchema,
  updateAssigneeSchema,
  changeLeaderSchema,
  queryHistorySchema,
} from "./ticket.schema.js";

import { exportTicketsExcel, exportTicketsPdf } from "../export/export.controller.js";

const router = Router();

/**
 * GET /tickets/stream
 * Server-Sent Events (SSE) stream for real-time ticket updates
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
 * GET /tickets/:id/history
 * Detailed history logs for a ticket
 */
router.get(
  "/:id/history",
  authenticate,
  validate(queryHistorySchema, "query"),
  ticketController.getTicketHistory
);

/**
 * GET /tickets/:id/history/:version
 * Specific version detail of ticket history
 */
router.get(
  "/:id/history/:version",
  authenticate,
  ticketController.getTicketHistoryDetail
);

/**
 * GET /tickets/:id/assignees
 * List of team members assigned to ticket
 */
router.get(
  "/:id/assignees",
  authenticate,
  ticketController.getTicketAssignees
);



/**
 * POST /tickets/:id/assignees
 * Add team member to ticket (strictly allowed for Leader only)
 */
router.post(
  "/:id/assignees",
  authenticate,
  validate(addAssigneeSchema, "body"),
  ticketController.addAssignee
);

/**
 * PATCH /tickets/:id/assignees/:assigneeId
 * PUT /tickets/:id/assignees/:assigneeId
 * Update / edit team member in ticket (strictly allowed for Leader only)
 */
router.patch(
  "/:id/assignees/:assigneeId",
  authenticate,
  validate(updateAssigneeSchema, "body"),
  ticketController.updateAssignee
);
router.put(
  "/:id/assignees/:assigneeId",
  authenticate,
  validate(updateAssigneeSchema, "body"),
  ticketController.updateAssignee
);

/**
 * PATCH /tickets/:id/leader
 * Transfer ticket leadership to another assignee
 */
router.patch(
  "/:id/leader",
  authenticate,
  validate(changeLeaderSchema, "body"),
  ticketController.changeLeader
);

/**
 * DELETE /tickets/:id/assignees/:assigneeId
 * Remove an assignee from ticket
 */
router.delete(
  "/:id/assignees/:assigneeId",
  authenticate,
  ticketController.removeAssignee
);

/**
 * GET /tickets/:id
 * Detail ticket by ID
 */
router.get("/:id", authenticate, ticketController.getTicketById);

/**
 * PATCH /tickets/:id
 * Update status, handling note, or other ticket data
 * (Restricted: Software team must be in assignees; Aftersales freely allowed)
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
