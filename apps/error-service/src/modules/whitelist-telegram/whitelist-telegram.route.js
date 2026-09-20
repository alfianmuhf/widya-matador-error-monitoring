import { Router } from "express";
import * as telegramController from "./whitelist-telegram.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createTelegramUserSchema,
  updateTelegramUserSchema,
  queryTelegramUserSchema,
} from "./whitelist-telegram.schema.js";

const router = Router();

// Semua endpoint Whitelist Telegram wajib login
router.use(authenticate);

// GET all whitelisted Telegram users — dapat diakses oleh semua role terautentikasi
router.get("/", validate(queryTelegramUserSchema, "query"), telegramController.getTelegramUsers);

// GET single whitelisted Telegram user by internal UUID — dapat diakses oleh semua role terautentikasi
router.get("/:id", telegramController.getTelegramUserById);

// POST add new Telegram user to whitelist — khusus ADMIN & COORDINATOR
router.post(
  "/",
  authorize("ADMIN", "COORDINATOR"),
  validate(createTelegramUserSchema, "body"),
  telegramController.createTelegramUser
);

// PATCH update Telegram user (status isActive, username, fullName) — khusus ADMIN & COORDINATOR
router.patch(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  validate(updateTelegramUserSchema, "body"),
  telegramController.updateTelegramUser
);

// DELETE remove Telegram user from whitelist — khusus ADMIN & COORDINATOR
router.delete(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  telegramController.deleteTelegramUser
);

export default router;
