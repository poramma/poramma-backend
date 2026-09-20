import { Request, Response } from "express";
import { rendezvousLogic } from "@poramma/ambassade-core";
import { communityRendezVousDto, ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";
import { db } from "../../db/connection";
import { toPublicRendezVous, toPublicComment } from "../../shared/public-mappers";
import { sanitizeText } from "../../shared/sanitize";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

const userIdOf = (req: Request) => (req as any).userId as string;
const ipOf = (req: Request) => req.ip ?? null;

/** GET /rendez-vous/slots — créneaux d'un service pour une date (aucun agent exposé ; créneaux passés exclus). */
export async function listSlots(req: Request, res: Response) {
  const parsed = communityRendezVousDto.slotsQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Paramètres invalides", zodDetails(parsed.error));
  res.json(ok(await rendezvousLogic.listPublicSlots(db, parsed.data)));
}

/** GET /rendez-vous/available-dates — jours à venir ayant au moins un créneau libre. */
export async function listAvailableDates(req: Request, res: Response) {
  const parsed = communityRendezVousDto.availableDatesQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Paramètres invalides", zodDetails(parsed.error));
  res.json(ok(await rendezvousLogic.listAvailableDates(db, parsed.data)));
}

export async function listMine(req: Request, res: Response) {
  const items = await rendezvousLogic.listByUser(db, userIdOf(req));
  res.json(ok(items.map(toPublicRendezVous)));
}

export async function getOne(req: Request, res: Response) {
  res.json(ok(toPublicRendezVous(await rendezvousLogic.getOwned(db, userIdOf(req), req.params.id))));
}

export async function book(req: Request, res: Response) {
  const parsed = communityRendezVousDto.bookRendezVousDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const row = await rendezvousLogic.bookForUser(db, {
    userId: userIdOf(req),
    subServiceId: parsed.data.subServiceId,
    date: parsed.data.date,
    startTime: parsed.data.startTime,
    motif: parsed.data.motif ? sanitizeText(parsed.data.motif) : null,
    demandeId: parsed.data.demandeId ?? null,
    ip: ipOf(req),
  });
  const item = await rendezvousLogic.getOwned(db, userIdOf(req), row.id);
  res.status(201).json(ok(toPublicRendezVous(item), undefined, "Votre rendez-vous est enregistré. L'ambassade le confirmera prochainement."));
}

export async function reschedule(req: Request, res: Response) {
  const parsed = communityRendezVousDto.rescheduleRendezVousDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const item = await rendezvousLogic.rescheduleByUser(db, { userId: userIdOf(req), id: req.params.id, ...parsed.data, ip: ipOf(req) });
  res.json(ok(toPublicRendezVous(item), undefined, "Votre rendez-vous a été déplacé. L'ambassade le confirmera à nouveau."));
}

export async function cancel(req: Request, res: Response) {
  const parsed = communityRendezVousDto.cancelRendezVousDto.safeParse(req.body ?? {});
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const item = await rendezvousLogic.cancelByUser(db, {
    userId: userIdOf(req),
    id: req.params.id,
    reason: parsed.data.reason ? sanitizeText(parsed.data.reason) : null,
    ip: ipOf(req),
  });
  res.json(ok(toPublicRendezVous(item), undefined, "Votre rendez-vous a été annulé."));
}

/** GET /rendez-vous/:id/notes — échanges publics avec l'ambassade (jamais l'identité d'un agent). */
export async function listNotes(req: Request, res: Response) {
  const item = await rendezvousLogic.getOwned(db, userIdOf(req), req.params.id);
  const notes = await rendezvousLogic.listNotesForUser(db, userIdOf(req), req.params.id);
  // Espace culturel : le conseiller signe de son vrai nom.
  res.json(ok(notes.map((n) => toPublicComment(n, !!item.advisor))));
}

export async function addNote(req: Request, res: Response) {
  const parsed = communityRendezVousDto.addRendezVousNoteDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));
  const note = await rendezvousLogic.addNoteByUser(db, {
    userId: userIdOf(req),
    id: req.params.id,
    content: sanitizeText(parsed.data.content),
    ip: ipOf(req),
  });
  res.status(201).json(ok(toPublicComment(note)));
}
