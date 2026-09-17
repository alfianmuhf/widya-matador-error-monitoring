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

// Read (GET all & GET by ID) — dapat diakses oleh ADMIN, COORDINATOR, VIEWER
router.get("/", validate(queryComponentSchema, "query"), componentController.getComponents);
router.get("/:id", componentController.getComponentById);

// Create, Update, Delete — khusus role ADMIN & COORDINATOR
router.post(
  "/",
  authorize("ADMIN", "COORDINATOR"),
  validate(createComponentSchema, "body"),
  componentController.createComponent
);

router.patch(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  validate(updateComponentSchema, "body"),
  componentController.updateComponent
);

router.put(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  validate(updateComponentSchema, "body"),
  componentController.updateComponent
);

router.delete(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  componentController.deleteComponent
);

export default router;
