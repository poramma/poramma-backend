import { Router, type Router as ExpressRouter } from "express";
import { listLogs, getLog, getStats, exportLogs, listMyActivity } from "./audit.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get("/audit/me", asyncHandler(listMyActivity));
router.get("/audit/stats", requirePermission("audit:read"), asyncHandler(getStats));
router.post("/audit/export", requirePermission("audit:export"), asyncHandler(exportLogs));
router.get("/audit/logs", requirePermission("audit:read"), asyncHandler(listLogs));
router.get("/audit/logs/:id", requirePermission("audit:read"), asyncHandler(getLog));

export default router;
