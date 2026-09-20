import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "@poramma/utils";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { listTickets, listAssignees, getTicket, addMessage, updateTicket } from "./support.controller";

const router: ExpressRouter = Router();

// Tickets de support des usagers : traités par l'administration uniquement.
router.get("/support-tickets", requireAuth, requirePermission("user:admin"), asyncHandler(listTickets));
router.get("/support-tickets/assignees", requireAuth, requirePermission("user:admin"), asyncHandler(listAssignees)); // avant /:id
router.get("/support-tickets/:id", requireAuth, requirePermission("user:admin"), asyncHandler(getTicket));
router.post("/support-tickets/:id/messages", requireAuth, requirePermission("user:admin"), asyncHandler(addMessage));
router.patch("/support-tickets/:id", requireAuth, requirePermission("user:admin"), asyncHandler(updateTicket));

export default router;
