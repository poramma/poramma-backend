import { Request, Response } from "express";
import * as agentsService from "./agents.service";
import { createAgentDto, updateAgentDto, listAgentsQueryDto } from "./dto";
import { ok, paginationMeta } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

export async function listAgents(req: Request, res: Response) {
  const parsed = listAgentsQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  const { data, total } = await agentsService.listAgents(parsed.data);
  // meta seulement si la pagination a été explicitement demandée — sinon `data`
  // contient déjà tout et un meta calculé sur une page fictive serait trompeur.
  const paginated = parsed.data.page !== undefined || parsed.data.limit !== undefined;
  const meta = paginated ? paginationMeta(parsed.data.page ?? 1, parsed.data.limit ?? 20, total) : undefined;
  res.json(ok(data, meta));
}

export async function getAgent(req: Request, res: Response) {
  res.json(ok(await agentsService.getAgent(req.params.id)));
}

export async function createAgent(req: Request, res: Response) {
  const parsed = createAgentDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const callerUserId = (req as any).userId;
  const agent = await agentsService.createAgent(parsed.data, callerUserId);
  res.status(201).json(ok(agent));
}

export async function updateAgent(req: Request, res: Response) {
  const parsed = updateAgentDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const agent = await agentsService.updateAgent(req.params.id, parsed.data);
  res.json(ok(agent));
}

export async function deleteAgent(req: Request, res: Response) {
  const callerUserId = (req as any).userId;
  await agentsService.deleteAgent(req.params.id, callerUserId);
  res.status(204).send();
}
