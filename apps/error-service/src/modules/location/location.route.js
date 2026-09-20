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

// Read (GET all & GET by ID) — dapat diakses oleh semua role
router.get("/", validate(queryLocationSchema, "query"), locationController.getLocations);
router.get("/:id", locationController.getLocationById);

// Create, Update, Delete — dapat diakses oleh semua role
router.post(
  "/",
  validate(createLocationSchema, "body"),
  locationController.createLocation
);

router.patch(
  "/:id",
  validate(updateLocationSchema, "body"),
  locationController.updateLocation
);

router.put(
  "/:id",
  validate(updateLocationSchema, "body"),
  locationController.updateLocation
);

router.delete(
  "/:id",
  locationController.deleteLocation
);

export default router;
