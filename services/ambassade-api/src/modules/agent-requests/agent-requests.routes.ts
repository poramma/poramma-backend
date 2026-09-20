import { Router, type Router as ExpressRouter } from "express";
import { createRequest, listMine, listAll, getOne, processRequest } from "./agent-requests.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

// « mine » AVANT « :id » pour ne pas être capturé comme un identifiant.
router.get("/agent-requests/mine", asyncHandler(listMine));
router.post("/agent-requests", asyncHandler(createRequest));

// Traitement : réservé à l'administration (user:admin — ADMIN uniquement).
router.get("/agent-requests", requirePermission("user:admin"), asyncHandler(listAll));
router.get("/agent-requests/:id", asyncHandler(getOne));
router.patch("/agent-requests/:id", requirePermission("user:admin"), asyncHandler(processRequest));

export default router;
