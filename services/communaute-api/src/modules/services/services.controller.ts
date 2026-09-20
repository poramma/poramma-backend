import { Request, Response } from "express";
import { servicesLogic } from "@poramma/ambassade-core";
import { communityServicesDto, ok } from "@poramma/dto";
import { db } from "../../db/connection";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

/** drizzle renvoie les colonnes `decimal` en string — le frontend attend un nombre. */
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

/** GET /services — accès libre, aucune authentification requise. */
export async function listServices(req: Request, res: Response) {
  const parsed = communityServicesDto.listServicesQueryDto.safeParse(req.query);
  if (!parsed.success) return res.status(422).json({ success: false, error: zodDetails(parsed.error) });

  const all = await servicesLogic.listServices(db);
  // L'espace culturel a sa propre section (GET /culture) : hors du catalogue des services consulaires.
  const activeOnly = all.filter((s: any) => s.active && !s.isCultural);

  const q = parsed.data.q?.toLowerCase();
  const filtered = q ? activeOnly.filter((s: any) => s.name.toLowerCase().includes(q)) : activeOnly;

  res.json(ok(filtered.map(serializeService)));
}

export async function getService(req: Request, res: Response) {
  const service = await servicesLogic.getService(db, req.params.id);
  res.json(ok(serializeService(service)));
}

export async function getServiceSubServices(req: Request, res: Response) {
  const service = await servicesLogic.getService(db, req.params.id);
  res.json(ok((service.subServices ?? []).filter((s: any) => s.active).map(serializeSub)));
}

export async function getSubService(req: Request, res: Response) {
  const sub = await servicesLogic.getSubService(db, req.params.id);
  res.json(ok(serializeSub(sub)));
}
