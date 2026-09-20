import { Router, type Router as ExpressRouter } from "express";
import { createTicket, listMyTickets, getMyTicket, replyToMyTicket, resolveMyTicket } from "./support.controller";
import { requireAuth, rateLimit } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

// Ouvert dès la création du compte (pas de requireValidatedProfile) : un usager dont le dossier
// n'est pas encore validé doit pouvoir écrire à l'ambassade. Plafonné pour éviter le spam.
router.post("/support", rateLimit("support", 5, 3600), asyncHandler(createTicket));
router.get("/support/tickets", asyncHandler(listMyTickets));
router.get("/support/tickets/:id", asyncHandler(getMyTicket));
router.post("/support/tickets/:id/messages", rateLimit("support-messages", 60, 3600), asyncHandler(replyToMyTicket));
router.post("/support/tickets/:id/resolve", asyncHandler(resolveMyTicket));

export default router;
