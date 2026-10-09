import { Router } from "express";
import * as userController from "./user.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createUserSchema, updateUserSchema } from "./user.schema.js";

const router = Router();

// Seluruh endpoint manajemen pengguna memerlukan otentikasi login
router.use(authenticate);

// KHUSUS ADMIN: Mendaftarkan user baru dengan initial password otomatis
router.post(
  "/",
  authorize("ADMIN"),
  validate(createUserSchema),
  userController.createUser
);

// Melihat daftar pengguna (REST API GET) — khusus ADMIN & COORDINATOR (Coordinator hanya lihat)
router.get(
  "/",
  authorize("ADMIN", "COORDINATOR"),
  userController.getUsers
);

// Melihat detail pengguna berdasarkan ID — khusus ADMIN & COORDINATOR (Coordinator hanya lihat)
router.get(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  userController.getUserById
);

// KHUSUS ADMIN: Mengubah data pengguna (email, nama, password, role, status)
router.patch(
  "/:id",
  authorize("ADMIN"),
  validate(updateUserSchema),
  userController.updateUser
);

router.put(
  "/:id",
  authorize("ADMIN"),
  validate(updateUserSchema),
  userController.updateUser
);

// KHUSUS ADMIN: Menghapus pengguna berdasarkan ID
router.delete(
  "/:id",
  authorize("ADMIN"),
  userController.deleteUser
);

export default router;

