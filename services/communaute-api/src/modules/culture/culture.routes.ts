import { Router, type Router as ExpressRouter } from "express";
import { overview, createThread, listMyThreads, getMyThread, replyToMyThread } from "./culture.controller";
import { requireAuth, requireValidatedProfile, rateLimit } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

// Lire l'espace culturel et ses propres échanges : tout compte connecté. Écrire au conseiller :
// profil validé (même règle que les rendez-vous et les demandes), plafonné contre le spam.
router.get("/culture", asyncHandler(overview));
router.get("/culture/threads", asyncHandler(listMyThreads));
router.post("/culture/threads", requireValidatedProfile, rateLimit("culture", 10, 3600), asyncHandler(createThread));
router.get("/culture/threads/:id", asyncHandler(getMyThread));
router.post("/culture/threads/:id/messages", requireValidatedProfile, rateLimit("culture-messages", 60, 3600), asyncHandler(replyToMyThread));

export default router;
