import { Router } from "express";
import * as clientController from "./client.controller.js";
import { authenticate, authorize } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createClientSchema,
  updateClientSchema,
  queryClientSchema,
} from "./client.schema.js";

const router = Router();

// Seluruh endpoint Client wajib terautentikasi (Access Token)
router.use(authenticate);

// Read (GET all & GET by ID) — dapat diakses oleh semua role
router.get("/", validate(queryClientSchema, "query"), clientController.getClients);
router.get("/:id", clientController.getClientById);

// Create, Update, Delete — khusus ADMIN & COORDINATOR
router.post(
  "/",
  authorize("ADMIN", "COORDINATOR"),
  validate(createClientSchema, "body"),
  clientController.createClient
);

router.patch(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  validate(updateClientSchema, "body"),
  clientController.updateClient
);

router.put(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  validate(updateClientSchema, "body"),
  clientController.updateClient
);

router.delete(
  "/:id",
  authorize("ADMIN", "COORDINATOR"),
  clientController.deleteClient
);

export default router;
