import { Router, type Router as ExpressRouter } from "express";
import {
  listCampagnes,
  getCampagne,
  createCampagne,
  updateCampagne,
  sendCampagne,
  scheduleCampagne,
  cancelCampagne,
  duplicateCampagne,
  listDeliveries,
  resendToFailed,
  uploadAttachment,
  getCampagneFile,
  removeAttachment,
  reorderAttachments,
  updateAttachment,
  estimateRecipients,
  upload,
} from "./communication.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

// estimate AVANT /campagnes/:id pour ne pas être capturé comme un :id.
router.post("/communication/campagnes/estimate", requirePermission("comm:create"), asyncHandler(estimateRecipients));

router.get("/communication/campagnes", requirePermission("comm:read"), asyncHandler(listCampagnes));
router.post("/communication/campagnes", requirePermission("comm:create"), asyncHandler(createCampagne));
router.get("/communication/campagnes/:id", requirePermission("comm:read"), asyncHandler(getCampagne));
router.patch("/communication/campagnes/:id", requirePermission("comm:create"), asyncHandler(updateCampagne));
router.post("/communication/campagnes/:id/send", requirePermission("comm:send"), asyncHandler(sendCampagne));
router.patch("/communication/campagnes/:id/schedule", requirePermission("comm:send"), asyncHandler(scheduleCampagne));
router.patch("/communication/campagnes/:id/cancel", requirePermission("comm:send"), asyncHandler(cancelCampagne));
router.post("/communication/campagnes/:id/duplicate", requirePermission("comm:create"), asyncHandler(duplicateCampagne));
router.get("/communication/campagnes/:id/deliveries", requirePermission("comm:read"), asyncHandler(listDeliveries));
router.post("/communication/campagnes/:id/resend-failed", requirePermission("comm:send"), asyncHandler(resendToFailed));

router.get("/communication/campagnes/:id/files/:fileId", requirePermission("comm:read"), asyncHandler(getCampagneFile));
router.post("/communication/campagnes/:id/attachments", requirePermission("comm:create"), upload.single("file"), asyncHandler(uploadAttachment));
router.delete("/communication/campagnes/:id/attachments/:attachmentId", requirePermission("comm:create"), asyncHandler(removeAttachment));
router.patch("/communication/campagnes/:id/attachments/reorder", requirePermission("comm:create"), asyncHandler(reorderAttachments));
// APRÈS /reorder : « reorder » ne doit pas être capturé comme un :attachmentId.
router.patch("/communication/campagnes/:id/attachments/:attachmentId", requirePermission("comm:create"), asyncHandler(updateAttachment));

export default router;
