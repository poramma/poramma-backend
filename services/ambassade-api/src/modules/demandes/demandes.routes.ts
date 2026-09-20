import { Router, type Router as ExpressRouter } from "express";
import {
  listDemandes,
  getDemande,
  createDemande,
  updateStatus,
  assignAgent,
  listHistory,
  listComments,
  addComment,
  listRequirements,
  listDemandeDocuments,
  validateRequirement,
} from "./demandes.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();

router.use(requireAuth);

// updateStatus checks demande:validate/reject/update itself (depends on the
// target status — see demandes.controller.ts), so no requirePermission here.
// listDemandes et la création restent staff-only : le parcours citoyen (création,
// "mes demandes") est servi par communaute-api. Le détail et ses sous-ressources
// (history/comments/requirements) acceptent aussi le demandeur propriétaire
// du dossier — voir assertCanAccessDemande dans le contrôleur.
router.get("/demandes", requirePermission("demande:read"), asyncHandler(listDemandes));
router.get("/demandes/:id", asyncHandler(getDemande));
router.post("/demandes", requirePermission("demande:create"), asyncHandler(createDemande));
router.patch("/demandes/:id/status", asyncHandler(updateStatus));
router.post("/demandes/:id/assign", requirePermission("demande:assign"), asyncHandler(assignAgent));

router.get("/demandes/:id/history", asyncHandler(listHistory));
router.get("/demandes/:id/comments", asyncHandler(listComments));
router.post("/demandes/:id/comments", asyncHandler(addComment));

router.get("/demandes/:id/requirements", asyncHandler(listRequirements));
router.get("/demandes/:id/documents", asyncHandler(listDemandeDocuments));
router.patch("/demandes/requirements/:requirementId", requirePermission("demande:validate"), asyncHandler(validateRequirement));

export default router;
