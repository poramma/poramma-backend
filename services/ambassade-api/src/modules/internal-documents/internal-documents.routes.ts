import { Router, type Router as ExpressRouter } from "express";
import {
  listInternalDocuments,
  getInternalDocument,
  createInternalDocument,
  shareInternalDocument,
  downloadInternalDocument,
  upload,
} from "./internal-documents.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

// Visibilité gérée dans le service (PUBLIC/INTERNAL ouverts à tout le staff
// avec document:read, RESTRICTED/CONFIDENTIAL limités aux destinataires
// désignés + créateur + ADMIN) — pas de gate self-access ici, ce n'est pas
// un document citoyen.
router.get("/internal-documents", requirePermission("document:read"), asyncHandler(listInternalDocuments));
router.post("/internal-documents", requirePermission("document:upload"), upload.single("file"), asyncHandler(createInternalDocument));
router.get("/internal-documents/:id", requirePermission("document:read"), asyncHandler(getInternalDocument));
router.get("/internal-documents/:id/download", requirePermission("document:read"), asyncHandler(downloadInternalDocument));
router.patch("/internal-documents/:id/share", requirePermission("document:share"), asyncHandler(shareInternalDocument));

export default router;
