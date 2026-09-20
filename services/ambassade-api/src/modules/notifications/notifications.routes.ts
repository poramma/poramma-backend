import { Router, type Router as ExpressRouter } from "express";
import { listNotifications, markAsRead, markAllAsRead } from "./notifications.controller";
import { requireAuth } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

// Notifications personnelles — pas de permission dédiée, comme /profile:
// chaque utilisateur authentifié ne voit que les siennes (scope appliqué
// côté service via userId, jamais un paramètre client).
router.patch("/notifications/read-all", asyncHandler(markAllAsRead));
router.get("/notifications", asyncHandler(listNotifications));
router.patch("/notifications/:id/read", asyncHandler(markAsRead));

export default router;
