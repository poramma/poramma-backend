import { Router, type Router as ExpressRouter } from "express";
import { listServices, getService, getServiceSubServices, getSubService } from "./services.controller";
import { asyncHandler } from "@poramma/utils";
import { rateLimit } from "../../shared/middleware";

const router: ExpressRouter = Router();

// Consultation libre — RÈGLE mission §10.3 : aucune authentification requise
// pour parcourir le catalogue de services.
// Limiteur par route (pas router.use : ce routeur est monté à "/", un limiteur global
// compterait aussi les requêtes destinées aux autres modules).
const limit = rateLimit("services", 100, 3600);

router.get("/services", limit, asyncHandler(listServices));
router.get("/services/:id", limit, asyncHandler(getService));
router.get("/services/:id/sub-services", limit, asyncHandler(getServiceSubServices));
router.get("/sub-services/:id", limit, asyncHandler(getSubService));

export default router;
