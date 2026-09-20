import { Router, type Router as ExpressRouter } from "express";
import {
  listThreads,
  getThread,
  createThread,
  addParticipant,
  updateThreadStatus,
  listMessages,
  sendMessage,
  markThreadRead,
  upload,
} from "./messaging.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);
router.use(requirePermission("message:read"));

router.get("/threads", asyncHandler(listThreads));
router.post("/threads", requirePermission("message:create"), asyncHandler(createThread));
router.get("/threads/:id", asyncHandler(getThread));
router.post("/threads/:id/participants", asyncHandler(addParticipant));
router.patch("/threads/:id/status", asyncHandler(updateThreadStatus));
router.patch("/threads/:id/read", asyncHandler(markThreadRead));
router.get("/threads/:id/messages", asyncHandler(listMessages));
router.post(
  "/threads/:id/messages",
  requirePermission("message:create"),
  upload.array("files", 5),
  asyncHandler(sendMessage)
);

export default router;
