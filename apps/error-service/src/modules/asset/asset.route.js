import { Router } from "express";
import * as assetController from "./asset.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createAssetSchema,
  updateAssetSchema,
  queryAssetSchema,
} from "./asset.schema.js";

const router = Router();

// Seluruh endpoint Asset wajib terautentikasi (Access Token)
router.use(authenticate);

// Read (GET all & GET by ID) — dapat diakses oleh semua role
router.get("/", validate(queryAssetSchema, "query"), assetController.getAssets);
router.get("/:id", assetController.getAssetById);

// Create, Update, Delete — khusus ADMIN & COORDINATOR
router.post(
  "/",
  authorize("ADMIN", "COORDINATOR"),
  validate(createAssetSchema, "body"),
  assetController.createAsset
);

router.patch(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  validate(updateAssetSchema, "body"),
  assetController.updateAsset
);

router.put(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  validate(updateAssetSchema, "body"),
  assetController.updateAsset
);

router.delete(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  assetController.deleteAsset
);

export default router;
