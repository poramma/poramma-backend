import { Router, type Router as ExpressRouter } from "express";
import {
  getSummary,
  listAppointments,
  lookupTicket,
  validateArrival,
  listWalkIns,
  createWalkIn,
  updateWalkIn,
  createDossier,
  createUrgence,
  searchMembers,
} from "./reception.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

// Poste d'accueil : permissions attribuées à l'agent d'accueil (et à l'administrateur).
router.get("/reception/summary", requirePermission("walkin:read"), asyncHandler(getSummary));

// Tickets de rendez-vous — « lookup » AVANT « :id » pour ne pas être capturé comme un identifiant.
router.get("/reception/appointments", requirePermission("rdv:checkin"), asyncHandler(listAppointments));
router.get("/reception/appointments/lookup", requirePermission("rdv:checkin"), asyncHandler(lookupTicket));
router.post("/reception/appointments/:id/validate", requirePermission("rdv:checkin"), asyncHandler(validateArrival));

// Rendez-vous d'urgence pris à l'accueil (membre ou personne sans compte) — permission historique de l'urgence.
router.post("/reception/urgences", requirePermission("rdv:create-urgence"), asyncHandler(createUrgence));

// Registre des demandes sur place.
router.get("/reception/walk-ins", requirePermission("walkin:read"), asyncHandler(listWalkIns));
router.post("/reception/walk-ins", requirePermission("walkin:manage"), asyncHandler(createWalkIn));
router.patch("/reception/walk-ins/:id", requirePermission("walkin:manage"), asyncHandler(updateWalkIn));
router.post("/reception/walk-ins/:id/create-dossier", requirePermission("walkin:manage"), asyncHandler(createDossier));

router.get("/reception/members", requirePermission("walkin:manage"), asyncHandler(searchMembers));

export default router;
