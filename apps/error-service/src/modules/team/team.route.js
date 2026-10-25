import { Router } from "express";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createTeamSchema,
  updateTeamSchema,
  queryTeamsSchema,
  addTeamMemberSchema,
} from "./team.schema.js";
import * as teamController from "./team.controller.js";

const router = Router();

// Semua rute tim membutuhkan autentikasi
router.use(authenticate);

/**
 * GET /teams - List semua tim (semua user terautentikasi dapat melihat)
 */
router.get(
  "/",
  validate(queryTeamsSchema, "query"),
  teamController.getTeams
);

/**
 * GET /teams/:id - Detail tim beserta leader & daftar anggota
 */
router.get(
  "/:id",
  teamController.getTeamById
);

/**
 * POST /teams - Membuat tim baru (Admin only)
 */
router.post(
  "/",
  authorize("admin"),
  validate(createTeamSchema, "body"),
  teamController.createTeam
);

/**
 * PATCH /teams/:id - Mengupdate tim (Admin only)
 */
router.patch(
  "/:id",
  authorize("admin"),
  validate(updateTeamSchema, "body"),
  teamController.updateTeam
);

/**
 * DELETE /teams/:id - Menghapus atau menonaktifkan tim (Admin only)
 */
router.delete(
  "/:id",
  authorize("admin"),
  teamController.deleteTeam
);

/**
 * POST /teams/:id/members - Menambahkan anggota ke tim (Admin atau Leader tim)
 */
router.post(
  "/:id/members",
  authorize("admin", "coordinator"),
  validate(addTeamMemberSchema, "body"),
  teamController.addTeamMember
);

/**
 * DELETE /teams/:id/members/:userId - Mengeluarkan anggota dari tim (Admin atau Leader tim)
 */
router.delete(
  "/:id/members/:userId",
  authorize("admin", "coordinator"),
  teamController.removeTeamMember
);

export default router;
