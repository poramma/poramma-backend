import { Request, Response } from "express";
import * as svc from "./services.service";
import {
  createServiceDto,
  updateServiceDto,
  createSubServiceDto,
  updateSubServiceDto,
  createScheduleDto,
  updateScheduleDto,
  createExceptionDto,
  createRequirementDto,
  updateRequirementDto,
} from "./dto";
import { ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

/** drizzle returns `decimal` columns as strings — frontend expects a number. */
function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function serializeSub(sub: any) {
  return { ...sub, basePrice: numOrNull(sub.basePrice) };
}

function serializeService(service: any) {
  return { ...service, subServices: (service.subServices ?? []).map(serializeSub) };
}

export async function listServices(_req: Request, res: Response) {
  const services = await svc.listServices();
  res.json(ok(services.map(serializeService)));
}

export async function getService(req: Request, res: Response) {
  res.json(ok(serializeService(await svc.getService(req.params.id))));
}

export async function createService(req: Request, res: Response) {
  const parsed = createServiceDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.status(201).json(ok(serializeService(await svc.createService(parsed.data))));
}

export async function updateService(req: Request, res: Response) {
  const parsed = updateServiceDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(serializeService(await svc.updateService(req.params.id, parsed.data))));
}

export async function deleteService(req: Request, res: Response) {
  await svc.deleteService(req.params.id);
  res.status(204).send();
}

export async function getServiceSubServices(req: Request, res: Response) {
  const service = await svc.getService(req.params.id);
  res.json(ok(service.subServices.map(serializeSub)));
}

export async function getSubService(req: Request, res: Response) {
  res.json(ok(serializeSub(await svc.getSubService(req.params.id))));
}

export async function createSubService(req: Request, res: Response) {
  const parsed = createSubServiceDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const sub = await svc.createSubService(parsed.data);
  res.status(201).json(ok(serializeSub(sub)));
}

export async function updateSubService(req: Request, res: Response) {
  const parsed = updateSubServiceDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(serializeSub(await svc.updateSubService(req.params.id, parsed.data))));
}

export async function createSchedule(req: Request, res: Response) {
  const parsed = createScheduleDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const schedule = await svc.createSchedule(req.params.id, parsed.data);
  res.status(201).json(ok(schedule));
}

export async function updateSchedule(req: Request, res: Response) {
  const parsed = updateScheduleDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(await svc.updateSchedule(req.params.id, parsed.data)));
}

export async function deleteSchedule(req: Request, res: Response) {
  await svc.deleteSchedule(req.params.id);
  res.status(204).send();
}

export async function createException(req: Request, res: Response) {
  const parsed = createExceptionDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const callerUserId = (req as any).userId;
  const exception = await svc.createException(req.params.id, parsed.data, callerUserId);
  res.status(201).json(ok(exception));
}

export async function deleteException(req: Request, res: Response) {
  await svc.deleteException(req.params.id);
  res.status(204).send();
}

export async function addRequirement(req: Request, res: Response) {
  const parsed = createRequirementDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const requirement = await svc.addRequirement(req.params.id, parsed.data);
  res.status(201).json(ok(requirement));
}

export async function updateRequirement(req: Request, res: Response) {
  const parsed = updateRequirementDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(await svc.updateRequirement(req.params.id, parsed.data)));
}

export async function removeRequirement(req: Request, res: Response) {
  await svc.removeRequirement(req.params.id);
  res.status(204).send();
}
