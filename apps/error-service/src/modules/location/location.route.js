import { Router } from "express";
import * as locationController from "./location.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createLocationSchema,
  updateLocationSchema,
  queryLocationSchema,
} from "./location.schema.js";

const router = Router();

// Seluruh endpoint Location wajib terautentikasi (Access Token)
router.use(authenticate);

// Read (GET all & GET by ID) — dapat diakses oleh ADMIN, COORDINATOR, VIEWER
router.get("/", validate(queryLocationSchema, "query"), locationController.getLocations);
router.get("/:id", locationController.getLocationById);

// Create, Update, Delete — khusus role ADMIN & COORDINATOR
router.post(
  "/",
  authorize("ADMIN", "COORDINATOR"),
  validate(createLocationSchema, "body"),
  locationController.createLocation
);

router.patch(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  validate(updateLocationSchema, "body"),
  locationController.updateLocation
);

router.put(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  validate(updateLocationSchema, "body"),
  locationController.updateLocation
);

router.delete(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  locationController.deleteLocation
);

export default router;
