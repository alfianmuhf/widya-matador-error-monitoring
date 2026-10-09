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

// GET all whitelisted Telegram users — khusus ADMIN & COORDINATOR
router.get(
  "/",
  authorize("ADMIN", "COORDINATOR"),
  validate(queryTelegramUserSchema, "query"),
  telegramController.getTelegramUsers
);

// GET single whitelisted Telegram user by internal UUID — khusus ADMIN & COORDINATOR
router.get(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  telegramController.getTelegramUserById
);

// POST add new Telegram user to whitelist — KHUSUS ADMIN
router.post(
  "/",
  authorize("ADMIN"),
  validate(createTelegramUserSchema, "body"),
  telegramController.createTelegramUser
);

// PATCH update Telegram user (status isActive, username, fullName) — KHUSUS ADMIN
router.patch(
  "/:id",
  authorize("ADMIN"),
  validate(updateTelegramUserSchema, "body"),
  telegramController.updateTelegramUser
);

// DELETE remove Telegram user from whitelist — KHUSUS ADMIN
router.delete(
  "/:id",
  authorize("ADMIN"),
  telegramController.deleteTelegramUser
);

export default router;
