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
} from "./auth.controller";

const router: ExpressRouter = Router();

router.post("/register", register);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", me);
router.patch("/profile", updateProfile);

export default router;
