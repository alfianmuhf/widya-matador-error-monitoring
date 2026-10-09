import { Router } from "express";
import * as ticketController from "./ticket.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
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
 * POST /tickets/:id/claim
 * Software team member claims ticket (first claim becomes Leader)
 */
router.post(
  "/:id/claim",
  authenticate,
  authorize("COORDINATOR"),
  ticketController.claimTicket
);

/**
 * POST /tickets/:id/assignees
 * Add team member to ticket
 */
router.post(
  "/:id/assignees",
  authenticate,
  authorize("COORDINATOR"),
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
  authorize("COORDINATOR"),
  validate(updateAssigneeSchema, "body"),
  ticketController.updateAssignee
);
router.put(
  "/:id/assignees/:assigneeId",
  authenticate,
  authorize("COORDINATOR"),
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
  authorize("COORDINATOR"),
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
  authorize("COORDINATOR"),
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
 * (Khusus COORDINATOR: Aftersales & Software sesuai tiket yang dihandle)
 */
router.patch(
  "/:id",
  authenticate,
  authorize("COORDINATOR"),
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
  authorize("COORDINATOR"),
  validate(addCommentSchema, "body"),
  ticketController.addComment
);

/**
 * POST /tickets
 * Create new ticket from dashboard (Khusus COORDINATOR)
 */
router.post(
  "/",
  authenticate,
  authorize("COORDINATOR"),
  validate(createTicketSchema, "body"),
  ticketController.createTicket
);

export default router;
