import { Router, type Router as ExpressRouter } from "express";
import {
  listServices,
  getService,
  createService,
  updateService,
  deleteService,
  getServiceSubServices,
  getSubService,
  createSubService,
  updateSubService,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  createException,
  deleteException,
  addRequirement,
  updateRequirement,
  removeRequirement,
} from "./services.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();

// Every route requires authentication; mutations additionally require
// "service:admin" (minRoleLevel 1 — ADMIN only, see the identity-api RBAC
// seed) — mission prompt SVC-01..05: service catalog management is
// ADMIN-exclusive, the AMBASSADOR can read but not modify.
router.use(requireAuth);

router.get("/services", requirePermission("service:read"), asyncHandler(listServices));
router.get("/services/:id", requirePermission("service:read"), asyncHandler(getService));
router.post("/services", requirePermission("service:admin"), asyncHandler(createService));
router.patch("/services/:id", requirePermission("service:admin"), asyncHandler(updateService));
router.delete("/services/:id", requirePermission("service:admin"), asyncHandler(deleteService));
router.get("/services/:id/sub-services", requirePermission("service:read"), asyncHandler(getServiceSubServices));

router.get("/sub-services/:id", requirePermission("service:read"), asyncHandler(getSubService));
router.post("/sub-services", requirePermission("service:admin"), asyncHandler(createSubService));
router.patch("/sub-services/:id", requirePermission("service:admin"), asyncHandler(updateSubService));

router.post("/sub-services/:id/schedules", requirePermission("service:admin"), asyncHandler(createSchedule));
router.patch("/schedules/:id", requirePermission("service:admin"), asyncHandler(updateSchedule));
router.delete("/schedules/:id", requirePermission("service:admin"), asyncHandler(deleteSchedule));

router.post("/sub-services/:id/exceptions", requirePermission("service:admin"), asyncHandler(createException));
router.delete("/exceptions/:id", requirePermission("service:admin"), asyncHandler(deleteException));

router.post("/sub-services/:id/requirements", requirePermission("service:admin"), asyncHandler(addRequirement));
router.patch("/requirements/:id", requirePermission("service:admin"), asyncHandler(updateRequirement));
router.delete("/requirements/:id", requirePermission("service:admin"), asyncHandler(removeRequirement));

export default router;
