import { Router } from "express";
import * as telegramController from "./telegram.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createTelegramUserSchema,
  updateTelegramUserSchema,
} from "./telegram.schema.js";

const router = Router();

// Seluruh endpoint Whitelist Telegram khusus untuk role ADMIN
router.use(authenticate, authorize("ADMIN"));

// Menambahkan user Telegram ke whitelist
router.post(
  "/",
  validate(createTelegramUserSchema),
  telegramController.createTelegramUser
);

// Melihat daftar seluruh user Telegram di whitelist
router.get("/", telegramController.getTelegramUsers);

// Melihat detail satu user Telegram di whitelist
router.get("/:id", telegramController.getTelegramUserById);

// Mengubah data user Telegram (status isActive, username, fullName)
router.patch(
  "/:id",
  validate(updateTelegramUserSchema),
  telegramController.updateTelegramUser
);

router.put(
  "/:id",
  validate(updateTelegramUserSchema),
  telegramController.updateTelegramUser
);

// Menghapus user Telegram dari whitelist
router.delete("/:id", telegramController.deleteTelegramUser);

export default router;
