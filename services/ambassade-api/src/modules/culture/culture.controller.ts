import { Request, Response } from "express";
import { z } from "zod";
import { ok, paginationMeta } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";
import { cultureLogic } from "@poramma/ambassade-core";
import { db } from "../../db/connection";
import { writeAudit } from "../audit/audit.service";
import * as svc from "./culture.service";

const listQueryDto = z.object({
  status: z.enum(["ACTIVE", "OPEN", "ANSWERED", "CLOSED"]).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const messageDto = z.object({
  content: z.string().trim().min(1, "Message vide").max(3000),
  isInternal: z.boolean().optional(),
});

const statusDto = z.object({ status: z.enum(["OPEN", "CLOSED"]) });

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

const actorOf = (req: Request) => ({ userId: (req as any).userId as string, roleName: ((req as any).roleName as string | null) ?? null });

export async function getOverview(req: Request, res: Response) {
  const actor = actorOf(req);
  res.json(ok(await svc.overview(actor.userId, actor.roleName)));
}

export async function listThreads(req: Request, res: Response) {
  const parsed = listQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));
  const { data, total, page, limit, stats } = await cultureLogic.listThreads(db, parsed.data);
  // `stats` = compteurs par statut, pour les pastilles de la file (en plus de la pagination).
  const meta = { ...paginationMeta(page, limit, total), stats };
  res.json(ok(data, meta));
}

export async function getThread(req: Request, res: Response) {
  res.json(ok(await cultureLogic.getThreadForStaff(db, req.params.id)));
}

export async function addMessage(req: Request, res: Response) {
  const parsed = messageDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));
  const actor = actorOf(req);
  const internal = parsed.data.isInternal ?? false;
  const thread = await cultureLogic.addStaffMessage(db, req.params.id, actor.userId, parsed.data.content, internal);
  await writeAudit({
    action: internal ? "NOTE" : "COMMENT",
    entityType: "CULTURE_ECHANGE",
    entityId: req.params.id,
    actor,
    details: { reference: thread.reference, internal },
  });
  res.status(201).json(ok(thread, undefined, internal ? "Note interne ajoutée." : "Réponse envoyée."));
}

export async function setStatus(req: Request, res: Response) {
  const parsed = statusDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));
  const actor = actorOf(req);
  const thread = await cultureLogic.setThreadStatus(db, req.params.id, actor.userId, parsed.data.status);
  await writeAudit({
    action: "UPDATE_STATUS",
    entityType: "CULTURE_ECHANGE",
    entityId: req.params.id,
    actor,
    entitySnapshot: { toStatus: thread.status },
    details: { reference: thread.reference },
  });
  res.json(ok(thread));
}
