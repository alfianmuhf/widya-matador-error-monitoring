import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  updateTicketSchema,
  addAssigneeSchema,
  transferAftersalesSchema,
  changeLeaderSchema,
} from "../ticket/ticket.schema.js";
import * as ticketManagementController from "./ticket-management.controller.js";

const router = Router();

/**
 * GET /ticket-management
 * Mengambil tiket yang harus dikelola oleh coordinator atau admin:
 * - Divisi after_sales: status open & aftersales_user_id = dirinya
 * - Divisi software: status escalated & dirinya terdaftar di ticket_assignees
 * - Admin: semua tiket belum solved (status open & escalated)
 */
router.get(
  "/",
  authenticate,
  authorize("admin", "coordinator"),
  ticketManagementController.getManagedTickets
);

/**
 * PATCH /ticket-management/:id
 * Memperbarui tiket dari halaman manajemen tiket oleh coordinator (Admin TIDAK BISA update tiket)
 */
router.patch(
  "/:id",
  authenticate,
  authorize("coordinator"),
  validate(updateTicketSchema, "body"),
  ticketManagementController.updateManagedTicket
);

/**
 * PATCH /ticket-management/:id/aftersales-lead
 * Mengalihkan penanggung jawab aftersales (khusus status open) oleh Coordinator PJ atau Admin
 */
router.patch(
  "/:id/aftersales-lead",
  authenticate,
  authorize("admin", "coordinator"),
  validate(transferAftersalesSchema, "body"),
  ticketManagementController.transferManagedAftersalesLead
);

/**
 * PATCH /ticket-management/:id/team
 * Mengalihkan tanggung jawab ke tim RnD lain (handover) oleh Leader tim aktif atau Admin
 */
router.patch(
  "/:id/team",
  authenticate,
  authorize("admin", "coordinator"),
  validate(changeLeaderSchema, "body"),
  ticketManagementController.handoverManagedTeam
);

/**
 * PATCH /ticket-management/:id/leader
 * Mengalihkan leader tim software (khusus status escalated) oleh Leader atau Admin
 */
router.patch(
  "/:id/leader",
  authenticate,
  authorize("admin", "coordinator"),
  validate(changeLeaderSchema, "body"),
  ticketManagementController.changeManagedLeader
);

/**
 * POST /ticket-management/:id/teams
 * Menambahkan tim kolaborasi ke tiket oleh leader tim aktif atau admin
 */
router.post(
  "/:id/teams",
  authenticate,
  authorize("admin", "coordinator"),
  validate(addAssigneeSchema, "body"),
  ticketManagementController.addManagedTeam
);

/**
 * DELETE /ticket-management/:id/teams/:teamId
 * Menghapus tim kolaborasi dari tiket oleh leader tim aktif atau admin
 */
router.delete(
  "/:id/teams/:teamId",
  authenticate,
  authorize("admin", "coordinator"),
  ticketManagementController.removeManagedTeam
);

/**
 * POST /ticket-management/:id/assignees
 * Menambahkan anggota tim software ke ticket_assignees oleh coordinator software leader atau admin
 */
router.post(
  "/:id/assignees",
  authenticate,
  authorize("admin", "coordinator"),
  validate(addAssigneeSchema, "body"),
  ticketManagementController.addManagedAssignee
);

/**
 * DELETE /ticket-management/:id/assignees/:assigneeId
 * Menghapus anggota tim software dari ticket_assignees oleh coordinator software leader, self, atau admin
 */
router.delete(
  "/:id/assignees/:assigneeId",
  authenticate,
  authorize("admin", "coordinator"),
  ticketManagementController.removeManagedAssignee
);

export default router;
