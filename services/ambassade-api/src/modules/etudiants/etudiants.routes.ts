import { Router, type Router as ExpressRouter } from "express";
import {
  listEtudiants,
  getEtudiant,
  searchEtudiants,
  getEtudiantDocuments,
  getEtudiantAudit,
  validateEtudiant,
  rejectEtudiant,
  suspendEtudiant,
  assignInue,
  estimateEtudiants,
} from "./etudiants.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

// /search et /estimate AVANT /:id pour ne pas être capturés comme un id.
router.get("/etudiants/search", requirePermission("etudiant:read"), asyncHandler(searchEtudiants));
router.post("/etudiants/estimate", requirePermission("etudiant:read"), asyncHandler(estimateEtudiants));

router.get("/etudiants", requirePermission("etudiant:read"), asyncHandler(listEtudiants));
// :id/détail/documents/audit acceptent aussi l'étudiant propriétaire du
// dossier (frontend-community) — voir assertCanAccessEtudiant dans le
// contrôleur, même principe que documents/demandes.
router.get("/etudiants/:id", asyncHandler(getEtudiant));
router.get("/etudiants/:id/documents", asyncHandler(getEtudiantDocuments));
router.get("/etudiants/:id/audit", asyncHandler(getEtudiantAudit));

router.post("/etudiants/:id/validate", requirePermission("etudiant:validate"), asyncHandler(validateEtudiant));
router.post("/etudiants/:id/reject", requirePermission("etudiant:validate"), asyncHandler(rejectEtudiant));
router.post("/etudiants/:id/suspend", requirePermission("etudiant:validate"), asyncHandler(suspendEtudiant));
router.post("/etudiants/:id/assign-inue", requirePermission("etudiant:validate"), asyncHandler(assignInue));

export default router;
