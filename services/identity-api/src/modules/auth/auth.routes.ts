import { Router, type Router as ExpressRouter } from "express";
import {
  register,
  verifyOtp,
  sendOtp,
  login,
  refresh,
  logout,
  me,
  updateProfile,
  getRoles,
  getPermissions,
  switchRole,
  forgotPassword,
  resetPassword,
} from "./auth.controller";
import { requireAuth } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();

// Routes publiques
router.post("/register", asyncHandler(register));
router.post("/send-otp", asyncHandler(sendOtp));
router.post("/verify-otp", asyncHandler(verifyOtp));
router.post("/login", asyncHandler(login));
router.post("/refresh", asyncHandler(refresh));
router.post("/forgot-password", asyncHandler(forgotPassword));
router.post("/reset-password", asyncHandler(resetPassword));

// Routes authentifiées : requireAuth renseigne (req as any).userId/roleName/roleLevel/permissions/sessionId
router.post("/logout", requireAuth, asyncHandler(logout));
router.get("/me", requireAuth, asyncHandler(me));
router.patch("/profile", requireAuth, asyncHandler(updateProfile));
router.get("/roles", requireAuth, asyncHandler(getRoles));
router.get("/permissions", requireAuth, asyncHandler(getPermissions));
router.post("/switch-role", requireAuth, asyncHandler(switchRole));

export default router;
