import { Router, type Router as ExpressRouter } from "express";
import {
  getUser,
  getUserProfile,
  updatePersonalInfo,
  updateAddress,
  updateStudentProfile,
  updateWorkerProfile,
  updateUserStatus,
} from "./users.controller";

const router: ExpressRouter = Router();

router.get("/me/:id", getUser);
router.get("/me/:id/profile", getUserProfile);
router.patch("/me/:id/personal-info", updatePersonalInfo);
router.patch("/me/:id/address", updateAddress);
router.patch("/me/:id/student", updateStudentProfile);
router.patch("/me/:id/worker", updateWorkerProfile);

router.patch("/:id/status", updateUserStatus);

export default router;
