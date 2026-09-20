import { Request, Response } from "express";
import * as svc from "./rendezvous.service";
import {
  agendaSlotsQueryDto,
  listRendezVousQueryDto,
  createRendezVousDto,
  createUrgenceDto,
  updateStatusDto,
  completeDto,
  cancelDto,
  printDailyDto,
  printHistoryQueryDto,
  addNoteDto,
} from "./dto";
import { ok } from "@poramma/dto";
import { ValidationError, ForbiddenError } from "@poramma/utils";
import { getAssignedSubServiceIds } from "../../shared/enrich";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

function actorOf(req: Request) {
  return { userId: (req as any).userId as string, roleName: (req as any).roleName as string | null };
}

function hasStaffReadAccess(req: Request): boolean {
  const permissions: string[] = (req as any).permissions || [];
  return permissions.includes("rdv:read");
}

/** ADMIN a carte blanche (voir project memory rbac_hierarchy_decision) ; tout le reste du staff est scopé à ses services assignés. */
function isAdmin(req: Request): boolean {
  return (req as any).roleName === "ADMIN";
}

/** L'accueil consulte les rendez-vous de TOUS les services (il oriente et valide les tickets) mais n'écrit pas dans les échanges. */
function canReadAllServices(req: Request): boolean {
  return isAdmin(req) || (req as any).roleName === "RECEPTIONIST";
}

/**
 * Espace d'échange demandeur ↔ agents (voir demandes.controller.ts pour le
 * même principe) : le staff avec rdv:read voit tout ; le demandeur
 * propriétaire du rendez-vous peut accéder à SES notes publiques.
 *
 * Un agent staff (non-ADMIN) ne peut accéder qu'aux rendez-vous des
 * sous-services auxquels il est affecté (agent_service_assignments).
 */
async function assertCanAccessRendezVous(req: Request, rendezVousId: string, write = false): Promise<boolean> {
  if (hasStaffReadAccess(req)) {
    if (!(write ? isAdmin(req) : canReadAllServices(req))) {
      const { subServiceId } = await svc.getRendezVousAccessInfo(rendezVousId);
      const scope = await getAssignedSubServiceIds((req as any).userId);
      if (!scope.includes(subServiceId)) throw new ForbiddenError("Ce service ne vous est pas assigné");
    }
    return true;
  }
  const ownerId = await svc.getRendezVousOwnerId(rendezVousId);
  if (ownerId !== (req as any).userId) throw new ForbiddenError("Accès non autorisé à ce rendez-vous");
  return false;
}

/** Lève 403 si le staff non-ADMIN n'est pas affecté au sous-service de ce rendez-vous. */
async function assertServiceScope(req: Request, rendezVousId: string): Promise<void> {
  if (isAdmin(req)) return;
  const { subServiceId } = await svc.getRendezVousAccessInfo(rendezVousId);
  const scope = await getAssignedSubServiceIds((req as any).userId);
  if (!scope.includes(subServiceId)) throw new ForbiddenError("Ce service ne vous est pas assigné");
}

export async function listAgendaSlots(req: Request, res: Response) {
  const parsed = agendaSlotsQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  res.json(ok(await svc.listAgendaSlots(parsed.data)));
}

export async function getAgendaSlot(req: Request, res: Response) {
  res.json(ok(await svc.getAgendaSlot(req.params.slotId)));
}

export async function listRendezVous(req: Request, res: Response) {
  const parsed = listRendezVousQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  if (!canReadAllServices(req)) {
    const scope = await getAssignedSubServiceIds((req as any).userId);
    if (parsed.data.subServiceId) {
      if (!scope.includes(parsed.data.subServiceId)) return res.json(ok([]));
    } else if (scope.length === 0) {
      return res.json(ok([]));
    } else {
      res.json(ok(await svc.listRendezVous({ ...parsed.data, subServiceIds: scope })));
      return;
    }
  }

  res.json(ok(await svc.listRendezVous(parsed.data)));
}

/** POST /rendez-vous — réservation au guichet par le personnel (rdv:create, vérifiée dans la route) pour n'importe quel usager. */
export async function createRendezVous(req: Request, res: Response) {
  const parsed = createRendezVousDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.status(201).json(ok(await svc.createRendezVous(parsed.data, actorOf(req))));
}

export async function createUrgence(req: Request, res: Response) {
  const parsed = createUrgenceDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.status(201).json(ok(await svc.createUrgence(parsed.data, actorOf(req))));
}

export async function updateStatus(req: Request, res: Response) {
  const parsed = updateStatusDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  await assertServiceScope(req, req.params.id);
  res.json(ok(await svc.updateStatus(req.params.id, parsed.data.status, actorOf(req))));
}

export async function checkIn(req: Request, res: Response) {
  await assertServiceScope(req, req.params.id);
  res.json(ok(await svc.checkIn(req.params.id)));
}

export async function complete(req: Request, res: Response) {
  const parsed = completeDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  await assertServiceScope(req, req.params.id);
  res.json(ok(await svc.completeRendezVous(req.params.id)));
}

export async function cancel(req: Request, res: Response) {
  const parsed = cancelDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  await assertServiceScope(req, req.params.id);
  res.json(ok(await svc.cancelRendezVous(req.params.id, parsed.data.cancelledBy ?? "AGENT")));
}

export async function printDaily(req: Request, res: Response) {
  const parsed = printDailyDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.status(201).json(ok(await svc.printDaily(parsed.data, actorOf(req))));
}

export async function printHistory(req: Request, res: Response) {
  const parsed = printHistoryQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  res.json(ok(await svc.printHistory(parsed.data.date)));
}

export async function reprint(req: Request, res: Response) {
  res.status(201).json(ok(await svc.reprint(req.params.id, actorOf(req))));
}

export async function listNotes(req: Request, res: Response) {
  const isStaff = await assertCanAccessRendezVous(req, req.params.id);
  const notes = await svc.listNotes(req.params.id);
  res.json(ok(isStaff ? notes : notes.filter((n) => !n.isInternal)));
}

export async function addNote(req: Request, res: Response) {
  const parsed = addNoteDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const isStaff = await assertCanAccessRendezVous(req, req.params.id, true);
  const note = await svc.addNote(req.params.id, parsed.data.content, parsed.data.isInternal ?? true, actorOf(req), isStaff);
  res.status(201).json(ok(note));
}
