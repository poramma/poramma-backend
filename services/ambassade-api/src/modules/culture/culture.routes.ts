import { Router, type Router as ExpressRouter } from "express";
import { getOverview, listThreads, getThread, addMessage, setStatus } from "./culture.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

// Espace du Conseiller Culturel (et de l'administrateur) : la permission culture:manage
// n'est attribuée qu'à ces deux rôles.
const guard = requirePermission("culture:manage");

router.get("/culture/overview", guard, asyncHandler(getOverview));
router.get("/culture/threads", guard, asyncHandler(listThreads));
router.get("/culture/threads/:id", guard, asyncHandler(getThread));
router.post("/culture/threads/:id/messages", guard, asyncHandler(addMessage));
router.patch("/culture/threads/:id", guard, asyncHandler(setStatus));

export default router;
