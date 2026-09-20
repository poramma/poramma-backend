import { Router, type Router as ExpressRouter } from "express";
import { listSlots, listAvailableDates, listMine, getOne, book, reschedule, cancel, listNotes, addNote } from "./rendezvous.controller";
import { requireAuth, requireValidatedProfile, rateLimit } from "../../shared/middleware";
import { asyncHandler } from "@poramma/utils";

const router: ExpressRouter = Router();
router.use(requireAuth);

// Prendre / déplacer un rendez-vous : profil validé requis (RÈGLE : INUE). Lire
// et annuler SES rendez-vous reste possible sans (le propriétaire est vérifié
// dans le service).
const limit = rateLimit("rdv", 10, 3600);

// AVANT /rendez-vous/:id pour que "slots" / "available-dates" ne soient pas capturés comme un id.
router.get("/rendez-vous/slots", requireValidatedProfile, asyncHandler(listSlots));
router.get("/rendez-vous/available-dates", requireValidatedProfile, asyncHandler(listAvailableDates));

router.get("/rendez-vous", asyncHandler(listMine));
router.post("/rendez-vous", requireValidatedProfile, limit, asyncHandler(book));
router.get("/rendez-vous/:id", asyncHandler(getOne));
router.post("/rendez-vous/:id/reschedule", requireValidatedProfile, limit, asyncHandler(reschedule));
router.post("/rendez-vous/:id/cancel", limit, asyncHandler(cancel));
// Espace d échange autour du rendez-vous : lecture libre pour le titulaire, écriture réservée aux profils validés.
router.get("/rendez-vous/:id/notes", asyncHandler(listNotes));
router.post("/rendez-vous/:id/notes", requireValidatedProfile, rateLimit("messages", 60, 3600), asyncHandler(addNote));

export default router;
