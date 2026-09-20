import { Router, type Router as ExpressRouter } from "express";
import { listNotifications, getUnreadCount, markAsRead, markAllAsRead } from "./notifications.controller";
import { requireAuth } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

// Notifications personnelles : disponibles dès la création du compte (pas de
// requireValidatedProfile — un citoyen non encore validé est notifié de l'état
// de son dossier d'enregistrement).
router.get("/notifications", asyncHandler(listNotifications));
router.get("/notifications/unread-count", asyncHandler(getUnreadCount));
router.patch("/notifications/read-all", asyncHandler(markAllAsRead));
router.patch("/notifications/:id/read", asyncHandler(markAsRead));

export default router;
