import { Router, type Router as ExpressRouter } from "express";
import { listCampagnes, getCampagne, recordView, recordClick, toggleReaction, streamMedia } from "./campagnes.controller";
import { requireAuth, rateLimit } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

/**
 * Média : authentifié par URL signée (les balises <img>/<video> n'envoient pas
 * d'en-tête Authorization). Routeur SÉPARÉ, monté avant tout routeur qui
 * applique `requireAuth` à "/" (sinon il intercepterait ces requêtes).
 */
export const campagnesMediaRouter: ExpressRouter = Router();
campagnesMediaRouter.get("/campagnes/media/:fileId", asyncHandler(streamMedia));

const router: ExpressRouter = Router();
router.use(requireAuth);

// Annonces : accessibles dès la création du compte (information publique de la
// communauté), sans exiger un profil validé. Les interactions sont limitées.
const interactionLimit = rateLimit("campagnes", 120, 3600);

router.get("/campagnes", asyncHandler(listCampagnes));
router.get("/campagnes/:id", asyncHandler(getCampagne));
router.post("/campagnes/:id/view", interactionLimit, asyncHandler(recordView));
router.post("/campagnes/:id/click", interactionLimit, asyncHandler(recordClick));
router.post("/campagnes/:id/reactions/:type", interactionLimit, asyncHandler(toggleReaction));

export default router;
