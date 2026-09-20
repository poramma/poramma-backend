import { Router, type Router as ExpressRouter } from "express";
import { listMyDocuments, getDocument, uploadDocument, downloadDocument, deleteDocument, upload } from "./documents.controller";
import { requireAuth, rateLimit } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get("/documents", asyncHandler(listMyDocuments));
router.post("/documents", rateLimit("documents-upload", 30, 3600), upload.single("file"), asyncHandler(uploadDocument));
router.get("/documents/:id", asyncHandler(getDocument));
router.get("/documents/:id/download", asyncHandler(downloadDocument));
router.delete("/documents/:id", asyncHandler(deleteDocument));

export default router;
