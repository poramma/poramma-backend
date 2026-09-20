import { Router, type Router as ExpressRouter } from "express";
import { getProfileStatus, getRegistration, submitRegistration } from "./profile.controller";
import { requireAuth, rateLimit } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get("/profile/status", asyncHandler(getProfileStatus));
router.get("/profile/registration", asyncHandler(getRegistration));
router.post("/profile/registration/submit", rateLimit("registration-submit", 10, 3600), asyncHandler(submitRegistration));

export default router;
