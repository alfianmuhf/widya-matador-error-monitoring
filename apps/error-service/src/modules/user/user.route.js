import { Router } from "express";
import * as userController from "./user.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { createUserSchema, updateUserSchema } from "./user.schema.js";

const router = Router();

// Seluruh endpoint manajemen pengguna memerlukan otentikasi login
router.use(authenticate);

// ADMIN & COORDINATOR: Mendaftarkan user baru dengan initial password otomatis
router.post(
  "/",
  authorize("ADMIN", "COORDINATOR"),
  validate(createUserSchema),
  userController.createUser
);

// Melihat daftar pengguna (REST API GET) — dapat diakses oleh semua role terautentikasi
router.get(
  "/",
  userController.getUsers
);

// Melihat detail pengguna berdasarkan ID — dapat diakses oleh semua role terautentikasi
router.get(
  "/:id",
  userController.getUserById
);

// ADMIN & COORDINATOR: Mengubah data pengguna (email, nama, password, role, status)
router.patch(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  validate(updateUserSchema),
  userController.updateUser
);

router.put(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  validate(updateUserSchema),
  userController.updateUser
);

// ADMIN & COORDINATOR: Menghapus pengguna berdasarkan ID
router.delete(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  userController.deleteUser
);

export default router;

