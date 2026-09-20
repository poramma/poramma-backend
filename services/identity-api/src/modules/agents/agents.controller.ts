import { Request, Response } from "express";
import * as agentsService from "./agents.service";
import { createAgentDto, updateAgentDto, listAgentsQueryDto } from "./dto";
import { ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

export async function listAgents(req: Request, res: Response) {
  const parsed = listAgentsQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  const agents = await agentsService.listAgents({
    search: parsed.data.search,
    department: parsed.data.department,
  });
  res.json(ok(agents));
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
