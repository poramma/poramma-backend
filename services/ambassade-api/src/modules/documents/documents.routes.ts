import { Router, type Router as ExpressRouter } from "express";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listDocuments,
  getDocument,
  uploadDocument,
  addVersion,
  listVersions,
  downloadDocument,
  validateDocument,
  archiveDocument,
  getStats,
  listAudit,
  upload,
} from "./documents.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

// Catégories — config admin, même gating que le catalogue de services
// (service:admin, ADMIN uniquement) ; lecture ouverte à qui peut lire les
// documents.
router.get("/document-categories", requirePermission("document:read"), asyncHandler(listCategories));
router.post("/document-categories", requirePermission("service:admin"), asyncHandler(createCategory));
router.patch("/document-categories/:id", requirePermission("service:admin"), asyncHandler(updateCategory));
router.delete("/document-categories/:id", requirePermission("service:admin"), asyncHandler(deleteCategory));

// stats/audit AVANT /documents/:id pour ne pas être capturés comme un :id.
router.get("/documents/stats", requirePermission("document:read"), asyncHandler(getStats));
router.get("/documents/audit", requirePermission("document:read"), asyncHandler(listAudit));

// La liste globale reste staff-only (même choix que demandes/rendez-vous) ;
// détail/versions/téléchargement/upload ont un accès "propriétaire" géré
// dans le contrôleur (assertCanAccessDocument) — pas de gate statique ici.
router.get("/documents", requirePermission("document:read"), asyncHandler(listDocuments));
router.post("/documents/upload", upload.single("file"), asyncHandler(uploadDocument));
router.get("/documents/:id", asyncHandler(getDocument));
router.get("/documents/:id/versions", asyncHandler(listVersions));
router.post("/documents/:id/versions", upload.single("file"), asyncHandler(addVersion));
router.get("/documents/:id/download", asyncHandler(downloadDocument));
router.patch("/documents/:id/validate", requirePermission("document:validate"), asyncHandler(validateDocument));
router.patch("/documents/:id/archive", requirePermission("document:archive"), asyncHandler(archiveDocument));

export default router;
