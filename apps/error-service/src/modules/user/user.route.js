import { Router } from "express";
import * as userController from "./user.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createUserSchema } from "./user.schema.js";

const router = Router();

// Seluruh endpoint manajemen pengguna memerlukan otentikasi login
router.use(authenticate);

// Khusus ADMIN: Mendaftarkan user baru dengan initial password otomatis
router.post(
  "/",
  authorize("ADMIN"),
  validate(createUserSchema),
  userController.createUser
);

// ADMIN & COORDINATOR: Melihat daftar pengguna (dengan pencarian & pagination)
router.get(
  "/",
  authorize("ADMIN", "COORDINATOR"),
  userController.getUsers
);

// ADMIN & COORDINATOR: Melihat detail pengguna berdasarkan ID
router.get(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  userController.getUserById
);

export default router;
