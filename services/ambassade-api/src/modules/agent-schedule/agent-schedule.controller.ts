import { Request, Response } from "express";
import * as svc from "./agent-schedule.service";
import { createAssignmentDto, updateAssignmentDto, createAvailabilityDto, updateAvailabilityDto, createExceptionDto } from "./dto";
import { ok } from "@poramma/dto";
import { ValidationError, ForbiddenError } from "@poramma/utils";
import { getAgentUserId } from "../../db/schema.identity-readonly";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

/**
 * Un agent gère toujours SON PROPRE planning (availability:create/update/
 * delete a déjà minRoleLevel=5, donc quasiment tout le staff l'a) ; seul
 * `availability:config` (ADMIN/AMBASSADEUR) permet de gérer le planning
 * D'UN AUTRE agent — reflète le sélecteur d'agent de DisponibilitesPage,
 * réservé à ce même niveau côté frontend.
 */
async function assertCanManageAgentSchedule(req: Request, targetAgentId: string) {
  const permissions: string[] = (req as any).permissions || [];
  if (permissions.includes("availability:config")) return;

  const callerUserId = (req as any).userId as string;
  const targetUserId = await getAgentUserId(targetAgentId);
  if (targetUserId !== callerUserId) throw new ForbiddenError("Vous ne pouvez gérer que votre propre planning");
}

// ── Assignments (ADMIN uniquement — service:admin, gated au niveau routes) ──

export async function listAssignments(req: Request, res: Response) {
  res.json(ok(await svc.listAssignments(req.params.id)));
}

export async function createAssignment(req: Request, res: Response) {
  const parsed = createAssignmentDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const assignedBy = (req as any).userId;
  res.status(201).json(ok(await svc.createAssignment(req.params.id, parsed.data, assignedBy)));
}

export async function updateAssignment(req: Request, res: Response) {
  const parsed = updateAssignmentDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(await svc.updateAssignment(req.params.assignmentId, parsed.data)));
}

export async function deleteAssignment(req: Request, res: Response) {
  await svc.deleteAssignment(req.params.assignmentId);
  res.status(204).send();
}

// ── Availabilities ──

export async function listAvailabilities(req: Request, res: Response) {
  res.json(ok(await svc.listAvailabilities(req.params.id, req.query.date as string | undefined)));
}

export async function createAvailability(req: Request, res: Response) {
  const parsed = createAvailabilityDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  await assertCanManageAgentSchedule(req, req.params.id);
  res.status(201).json(ok(await svc.createAvailability(req.params.id, parsed.data)));
}

export async function updateAvailability(req: Request, res: Response) {
  const parsed = updateAvailabilityDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  await assertCanManageAgentSchedule(req, req.params.id);
  res.json(ok(await svc.updateAvailability(req.params.availId, parsed.data)));
}

export async function deleteAvailability(req: Request, res: Response) {
  await assertCanManageAgentSchedule(req, req.params.id);
  await svc.deleteAvailability(req.params.availId);
  res.status(204).send();
}

// ── Exceptions ──

export async function listExceptions(req: Request, res: Response) {
  res.json(ok(await svc.listExceptions(req.params.id, req.query.date as string | undefined, req.query.from as string | undefined)));
}

export async function createException(req: Request, res: Response) {
  const parsed = createExceptionDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  await assertCanManageAgentSchedule(req, req.params.id);
  const createdBy = (req as any).userId;
  res.status(201).json(ok(await svc.createException(req.params.id, parsed.data, createdBy)));
}

export async function deleteException(req: Request, res: Response) {
  await assertCanManageAgentSchedule(req, req.params.id);
  await svc.deleteException(req.params.excId);
  res.status(204).send();
}
