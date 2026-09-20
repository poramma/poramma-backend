import { Router, type Router as ExpressRouter } from "express";
import {
  listAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  listAvailabilities,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  listExceptions,
  createException,
  deleteException,
} from "./agent-schedule.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();

router.use(requireAuth);

// Affectations agent ↔ service : mission prompt SVC-04, ADMIN uniquement.
router.get("/agents/:id/assignments", requirePermission("service:admin"), asyncHandler(listAssignments));
router.post("/agents/:id/assignments", requirePermission("service:admin"), asyncHandler(createAssignment));
router.patch("/assignments/:assignmentId", requirePermission("service:admin"), asyncHandler(updateAssignment));
router.delete("/assignments/:assignmentId", requirePermission("service:admin"), asyncHandler(deleteAssignment));

// Disponibilités : availability:create/update/delete couvre déjà tout le
// staff (minRoleLevel 5) ; le contrôleur ajoute la règle "soi-même OU
// availability:config" pour gérer le planning d'un AUTRE agent.
router.get("/agents/:id/availabilities", requirePermission("availability:read"), asyncHandler(listAvailabilities));
router.post("/agents/:id/availabilities", requirePermission("availability:create"), asyncHandler(createAvailability));
router.put("/agents/:id/availabilities/:availId", requirePermission("availability:update"), asyncHandler(updateAvailability));
router.delete("/agents/:id/availabilities/:availId", requirePermission("availability:delete"), asyncHandler(deleteAvailability));

router.get("/agents/:id/exceptions", requirePermission("availability:read"), asyncHandler(listExceptions));
router.post("/agents/:id/exceptions", requirePermission("availability:create"), asyncHandler(createException));
router.delete("/agents/:id/exceptions/:excId", requirePermission("availability:delete"), asyncHandler(deleteException));

export default router;
