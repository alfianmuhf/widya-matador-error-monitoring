import { Router } from "express";
import * as failureCodeController from "./failure-code.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createFailureCodeSchema,
  updateFailureCodeSchema,
  queryFailureCodeSchema,
} from "./failure-code.schema.js";

const router = Router();

// Seluruh endpoint Failure Code wajib terautentikasi (Access Token)
router.use(authenticate);

// Read (GET all & GET by ID) — dapat diakses oleh semua role
router.get("/", validate(queryFailureCodeSchema, "query"), failureCodeController.getFailureCodes);
router.get("/:id", failureCodeController.getFailureCodeById);

// Create, Update, Delete — khusus ADMIN & COORDINATOR
router.post(
  "/",
  authorize("ADMIN", "COORDINATOR"),
  validate(createFailureCodeSchema, "body"),
  failureCodeController.createFailureCode
);

router.patch(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  validate(updateFailureCodeSchema, "body"),
  failureCodeController.updateFailureCode
);

router.put(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  validate(updateFailureCodeSchema, "body"),
  failureCodeController.updateFailureCode
);

router.delete(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  failureCodeController.deleteFailureCode
);

export default router;
