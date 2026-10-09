import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { updateTicketSchema, addAssigneeSchema } from "../ticket/ticket.schema.js";
import * as ticketManagementController from "./ticket-management.controller.js";

const router = Router();

/**
 * GET /ticket-management
 * Mengambil tiket yang harus dikelola oleh coordinator yang sedang login:
 * - Divisi after_sales: status open & dibuat oleh dirinya (dicek dari history version 1 / 0)
 * - Divisi software: status escalated & dirinya terdaftar di ticket_assignees
 * Akses: HANYA coordinator (Admin dan Viewer ditolak)
 */
router.get(
  "/",
  authenticate,
  authorize("coordinator"),
  ticketManagementController.getManagedTickets
);

/**
 * PATCH /ticket-management/:id
 * Memperbarui tiket dari halaman manajemen tiket oleh coordinator
 */
router.patch(
  "/:id",
  authenticate,
  authorize("coordinator"),
  validate(updateTicketSchema, "body"),
  ticketManagementController.updateManagedTicket
);

/**
 * POST /ticket-management/:id/assignees
 * Menambahkan anggota tim software ke ticket_assignees oleh coordinator
 */
router.post(
  "/:id/assignees",
  authenticate,
  authorize("coordinator"),
  validate(addAssigneeSchema, "body"),
  ticketManagementController.addManagedAssignee
);

/**
 * DELETE /ticket-management/:id/assignees/:assigneeId
 * Menghapus anggota tim software dari ticket_assignees oleh coordinator
 */
router.delete(
  "/:id/assignees/:assigneeId",
  authenticate,
  authorize("coordinator"),
  ticketManagementController.removeManagedAssignee
);

export default router;
