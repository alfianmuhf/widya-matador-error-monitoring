import { Router } from "express";
import * as componentController from "./component.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createComponentSchema,
  updateComponentSchema,
  queryComponentSchema,
} from "./component.schema.js";

const router = Router();

// Seluruh endpoint Component wajib terautentikasi (Access Token)
router.use(authenticate);

// Read (GET all & GET by ID) — dapat diakses oleh semua role
router.get("/", validate(queryComponentSchema, "query"), componentController.getComponents);
router.get("/:id", componentController.getComponentById);

// Create, Update, Delete — dapat diakses oleh semua role
router.post(
  "/",
  validate(createComponentSchema, "body"),
  componentController.createComponent
);

router.patch(
  "/:id",
  validate(updateComponentSchema, "body"),
  componentController.updateComponent
);

router.put(
  "/:id",
  validate(updateComponentSchema, "body"),
  componentController.updateComponent
);

router.delete(
  "/:id",
  componentController.deleteComponent
);

export default router;
