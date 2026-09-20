import { Router, type Router as ExpressRouter } from "express";
import {
  getMyProfile,
  updateMyProfile,
  updateMyPreferences,
  updateMyPassword,
  getMyActivities,
  uploadSignature,
  getSignature,
  deleteSignature,
  uploadSignatureMiddleware,
} from "./profile.controller";
import { requireAuth } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();

// Self-service only — every route acts on the caller's own profile, no :id.
// Availabilities (PUT /profile/availabilities) belong to ambassade-api's
// schedule tables — deferred to Phase 6 (built there instead, under /agents).
router.use(requireAuth);

router.get("/", asyncHandler(getMyProfile));
router.patch("/", asyncHandler(updateMyProfile));
router.patch("/preferences", asyncHandler(updateMyPreferences));
router.post("/password", asyncHandler(updateMyPassword));
router.get("/activities", asyncHandler(getMyActivities));
router.post("/signature", uploadSignatureMiddleware.single("file"), asyncHandler(uploadSignature));
router.get("/signature", asyncHandler(getSignature));
router.delete("/signature", asyncHandler(deleteSignature));

export default router;
