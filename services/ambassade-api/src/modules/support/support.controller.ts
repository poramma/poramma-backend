import { Request, Response } from "express";
import { z } from "zod";
import { ok, paginationMeta } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";
import { supportLogic } from "@poramma/ambassade-core";
import { db } from "../../db/connection";
import { writeAudit } from "../audit/audit.service";

const listQueryDto = z.object({
  status: z.enum(["ACTIVE", ...supportLogic.TICKET_STATUSES]).optional(),
  category: z.enum(supportLogic.TICKET_CATEGORIES).optional(),
  priority: z.enum(supportLogic.TICKET_PRIORITIES).optional(),
  assigned: z.string().min(1).optional(), // "me" | "unassigned" | id d'un administrateur
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const messageDto = z.object({
  content: z.string().trim().min(1, "Message vide").max(3000),
  isInternal: z.boolean().optional(),
});

const updateDto = z
  .object({
    status: z.enum(supportLogic.TICKET_STATUSES).optional(),
    priority: z.enum(supportLogic.TICKET_PRIORITIES).optional(),
    assignedTo: z.string().uuid().nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.priority !== undefined || v.assignedTo !== undefined, { message: "Aucune modification demandée" });

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

const actorOf = (req: Request) => ({ userId: (req as any).userId as string, roleName: ((req as any).roleName as string | null) ?? null });

export async function listTickets(req: Request, res: Response) {
  const parsed = listQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));
  const { data, total, page, limit, stats } = await supportLogic.listTickets(db, actorOf(req).userId, parsed.data);
  // `stats` = compteurs par statut, pour les pastilles de la file (en plus de la pagination).
  const meta = { ...paginationMeta(page, limit, total), stats };
  res.json(ok(data, meta));
}

export async function listAssignees(_req: Request, res: Response) {
  res.json(ok(await supportLogic.listAssignees(db)));
}

export async function getTicket(req: Request, res: Response) {
  res.json(ok(await supportLogic.getTicketForStaff(db, req.params.id)));
}

export async function addMessage(req: Request, res: Response) {
  const parsed = messageDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));
  const actor = actorOf(req);
  const internal = parsed.data.isInternal ?? false;
  const ticket = await supportLogic.addStaffMessage(db, req.params.id, actor.userId, parsed.data.content, internal);
  await writeAudit({
    action: internal ? "NOTE" : "COMMENT",
    entityType: "TICKET_SUPPORT",
    entityId: req.params.id,
    actor,
    details: { reference: ticket.reference, internal },
  });
  res.status(201).json(ok(ticket, undefined, internal ? "Note interne ajoutée." : "Réponse envoyée à l'usager."));
}

export async function updateTicket(req: Request, res: Response) {
  const parsed = updateDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));
  const actor = actorOf(req);
  const before = await supportLogic.getTicketForStaff(db, req.params.id);
  const ticket = await supportLogic.updateTicket(db, req.params.id, actor.userId, parsed.data);
  await writeAudit({
    action: parsed.data.assignedTo !== undefined && parsed.data.status === undefined ? "ASSIGN" : "UPDATE_STATUS",
    entityType: "TICKET_SUPPORT",
    entityId: req.params.id,
    actor,
    severity: parsed.data.status === "CLOSED" ? "WARNING" : "INFO",
    entitySnapshot: {
      from: { status: before.status, priority: before.priority, assignee: before.assignee?.name ?? null },
      to: { status: ticket.status, priority: ticket.priority, assignee: ticket.assignee?.name ?? null },
    },
    details: { reference: ticket.reference },
  });
  res.json(ok(ticket));
}
