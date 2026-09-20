import { Router, type Router as ExpressRouter } from "express";
import { listAgents, getAgent, createAgent, updateAgent, deleteAgent } from "./agents.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();

router.use(requireAuth);

router.get("/", requirePermission("user:read"), asyncHandler(listAgents));
router.get("/:id", requirePermission("user:read"), asyncHandler(getAgent));
router.post("/", requirePermission("user:create"), asyncHandler(createAgent));
router.patch("/:id", requirePermission("user:update"), asyncHandler(updateAgent));
router.delete("/:id", requirePermission("user:delete"), asyncHandler(deleteAgent));

export default router;
