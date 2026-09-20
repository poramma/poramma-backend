import { Router, type Router as ExpressRouter } from "express";
import {
  listAgendaSlots,
  getAgendaSlot,
  listRendezVous,
  createRendezVous,
  createUrgence,
  updateStatus,
  checkIn,
  complete,
  cancel,
  printDaily,
  printHistory,
  reprint,
  listNotes,
  addNote,
} from "./rendezvous.controller";
import { requireAuth, requirePermission } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();

router.use(requireAuth);

router.get("/agenda-slots", requirePermission("rdv:read"), asyncHandler(listAgendaSlots));
router.get("/agenda-slots/:slotId", requirePermission("rdv:read"), asyncHandler(getAgendaSlot));

// print-daily/print-history/print/:id/reprint AVANT /rendez-vous/:id/* pour
// que "print-daily"/"print-history" ne soient pas capturés comme un :id.
router.post("/rendez-vous/print-daily", requirePermission("rdv:print-daily"), asyncHandler(printDaily));
router.get("/rendez-vous/print-history", requirePermission("rdv:print-daily"), asyncHandler(printHistory));
router.post("/rendez-vous/print/:id/reprint", requirePermission("rdv:print-daily"), asyncHandler(reprint));

router.get("/rendez-vous", requirePermission("rdv:read"), asyncHandler(listRendezVous));
// Réservation au guichet (staff, pour n'importe quel usager). Les rendez-vous
// libre-service des citoyens passent par communaute-api (/api/communaute/rendez-vous).
router.post("/rendez-vous", requirePermission("rdv:create"), asyncHandler(createRendezVous));
// Urgence reste staff-only : prise en charge d'un usager présent physiquement, pas un self-service.
router.post("/rendez-vous/urgence", requirePermission("rdv:create-urgence"), asyncHandler(createUrgence));
router.patch("/rendez-vous/:id/status", requirePermission("rdv:update"), asyncHandler(updateStatus));
router.post("/rendez-vous/:id/check-in", requirePermission("rdv:update"), asyncHandler(checkIn));
router.post("/rendez-vous/:id/complete", requirePermission("rdv:update"), asyncHandler(complete));
router.post("/rendez-vous/:id/cancel", requirePermission("rdv:cancel"), asyncHandler(cancel));

// Espace d'échange demandeur ↔ agents — accès staff (rdv:read) OU
// propriétaire du rendez-vous, vérifié dans le contrôleur (même principe
// que /demandes/:id/comments).
router.get("/rendez-vous/:id/notes", asyncHandler(listNotes));
router.post("/rendez-vous/:id/notes", asyncHandler(addNote));

export default router;
