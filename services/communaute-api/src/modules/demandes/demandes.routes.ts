import { Router, type Router as ExpressRouter } from "express";
import {
  listMyDemandes,
  getDemande,
  createDemande,
  listHistory,
  listComments,
  addComment,
  listRequirements,
  listDemandeDocuments,
} from "./demandes.controller";
import { requireAuth, requireValidatedProfile, rateLimit } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

// Lecture de SES dossiers : ouverte à tout membre connecté (le propriétaire est
// vérifié dans le contrôleur). Création et échanges : profil validé requis.
router.get("/demandes", asyncHandler(listMyDemandes));
router.post("/demandes", requireValidatedProfile, rateLimit("demandes-create", 20, 3600), asyncHandler(createDemande));
router.get("/demandes/:id", asyncHandler(getDemande));
router.get("/demandes/:id/history", asyncHandler(listHistory));
router.get("/demandes/:id/requirements", asyncHandler(listRequirements));
router.get("/demandes/:id/documents", asyncHandler(listDemandeDocuments));
router.get("/demandes/:id/comments", asyncHandler(listComments));
router.post("/demandes/:id/comments", requireValidatedProfile, rateLimit("messages", 60, 3600), asyncHandler(addComment));

export default router;
