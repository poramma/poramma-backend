import { Request, Response } from "express";
import { ok } from "@poramma/dto";
import { ValidationError, ForbiddenError } from "@poramma/utils";
import * as svc from "./etudiants.service";
import {
  listEtudiantsQueryDto,
  searchEtudiantsQueryDto,
  validateEtudiantDto,
  rejectEtudiantDto,
  suspendEtudiantDto,
  estimateEtudiantsDto,
} from "./dto";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

function actorOf(req: Request) {
  return { userId: (req as any).userId as string, roleName: (req as any).roleName ?? null };
}

/**
 * :id est le userId identity de l'étudiant (voir mergeView). Le staff avec
 * etudiant:read voit n'importe quel dossier ; un étudiant non-staff
 * (frontend-community) ne peut consulter QUE le sien — même principe que
 * assertCanAccessDocument/assertCanAccessDemande.
 */
function assertCanAccessEtudiant(req: Request, userId: string): void {
  if (userId === (req as any).userId) return;
  const permissions: string[] = (req as any).permissions || [];
  if (!permissions.includes("etudiant:read")) throw new ForbiddenError("Accès non autorisé à ce dossier étudiant");
}

export async function listEtudiants(req: Request, res: Response) {
  const parsed = listEtudiantsQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  const { data, meta } = await svc.listEtudiants(parsed.data);
  res.json(ok(data, meta));
}

export async function getEtudiant(req: Request, res: Response) {
  assertCanAccessEtudiant(req, req.params.id);
  const etudiant = await svc.getEtudiantDetail(req.params.id);
  res.json(ok(etudiant));
}

export async function searchEtudiants(req: Request, res: Response) {
  const parsed = searchEtudiantsQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Requête invalide", zodDetails(parsed.error));

  const results = await svc.searchEtudiants(parsed.data.q);
  res.json(ok(results));
}

export async function getEtudiantDocuments(req: Request, res: Response) {
  assertCanAccessEtudiant(req, req.params.id);
  const documents = await svc.getEtudiantDocuments(req.params.id);
  res.json(ok(documents));
}

export async function getEtudiantAudit(req: Request, res: Response) {
  assertCanAccessEtudiant(req, req.params.id);
  const logs = await svc.getEtudiantAudit(req.params.id);
  res.json(ok(logs));
}

export async function validateEtudiant(req: Request, res: Response) {
  const parsed = validateEtudiantDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const etudiant = await svc.validateEtudiant(req.params.id, parsed.data.comment, actorOf(req));
  res.json(ok(etudiant));
}

export async function rejectEtudiant(req: Request, res: Response) {
  const parsed = rejectEtudiantDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const etudiant = await svc.rejectEtudiant(req.params.id, parsed.data.reason, actorOf(req));
  res.json(ok(etudiant));
}

export async function suspendEtudiant(req: Request, res: Response) {
  const parsed = suspendEtudiantDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const etudiant = await svc.suspendEtudiant(req.params.id, parsed.data.reason, actorOf(req));
  res.json(ok(etudiant));
}

export async function assignInue(req: Request, res: Response) {
  const etudiant = await svc.assignInueToEtudiant(req.params.id, actorOf(req));
  res.json(ok(etudiant));
}

export async function estimateEtudiants(req: Request, res: Response) {
  const parsed = estimateEtudiantsDto.safeParse(req.body ?? {});
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  const estimate = await svc.estimateEtudiants(parsed.data);
  res.json(ok(estimate));
}
