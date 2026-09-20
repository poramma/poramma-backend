import { Request, Response } from "express";
import * as svc from "./agent-requests.service";
import { createAgentRequestDto, listAgentRequestsQueryDto, processAgentRequestDto } from "./dto";
import { ok } from "@poramma/dto";
import { ForbiddenError, ValidationError } from "@poramma/utils";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

const actorOf = (req: Request) => ({ userId: (req as any).userId as string, roleName: (req as any).roleName as string | null });

/** Seul le personnel (un rôle attribué) adresse des demandes à l'administration — pas un citoyen. */
function assertStaff(req: Request) {
  if (((req as any).roleLevel ?? 999) >= 999) throw new ForbiddenError("Réservé au personnel de l'ambassade");
}

export async function createRequest(req: Request, res: Response) {
  assertStaff(req);
  const parsed = createAgentRequestDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));
  res.status(201).json(ok(await svc.createRequest(actorOf(req), parsed.data), undefined, "Votre demande a été transmise à l'administrateur."));
}

export async function listMine(req: Request, res: Response) {
  assertStaff(req);
  res.json(ok(await svc.listMine(actorOf(req).userId)));
}

export async function listAll(req: Request, res: Response) {
  const parsed = listAgentRequestsQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));
  const { data, meta } = await svc.listAll(parsed.data);
  res.json(ok(data, meta));
}

export async function getOne(req: Request, res: Response) {
  const permissions: string[] = (req as any).permissions || [];
  const isAdmin = permissions.includes("user:admin");
  if (!isAdmin && (await svc.getOwnerId(req.params.id)) !== actorOf(req).userId) throw new ForbiddenError("Accès non autorisé à cette demande");
  res.json(ok(await svc.getRequest(req.params.id)));
}

export async function processRequest(req: Request, res: Response) {
  const parsed = processAgentRequestDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));
  res.json(ok(await svc.processRequest(req.params.id, parsed.data, actorOf(req))));
}
