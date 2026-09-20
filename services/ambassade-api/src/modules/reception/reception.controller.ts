import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";
import * as svc from "./reception.service";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

const appointmentsQueryDto = z.object({
  date: z.string().regex(dateRe).optional(),
  q: z.string().max(100).optional(),
});

const lookupQueryDto = z.object({ ticket: z.string().trim().min(3).max(50) });

const walkInListQueryDto = z.object({
  date: z.string().regex(dateRe).optional(),
  status: z.enum(["ACTIVE", ...svc.WALKIN_STATUSES]).optional(),
  q: z.string().max(100).optional(),
});

const createWalkInDto = z.object({
  visitorName: z.string().trim().max(150).optional(),
  visitorPhone: z.string().trim().max(30).nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
  subServiceId: z.string().min(1).nullable().optional(),
  category: z.enum(svc.WALKIN_CATEGORIES),
  subject: z.string().trim().min(3, "Décrivez la demande en quelques mots").max(1000),
  notes: z.string().trim().max(2000).nullable().optional(),
  priority: z.enum(["NORMAL", "URGENT"]).optional(),
});

const updateWalkInDto = z
  .object({
    status: z.enum(svc.WALKIN_STATUSES).optional(),
    priority: z.enum(["NORMAL", "URGENT"]).optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    outcome: z.string().trim().max(1000).nullable().optional(),
    subServiceId: z.string().min(1).nullable().optional(),
    redirectedSubServiceId: z.string().min(1).nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: "Aucune modification demandée" });

const visitorDto = z.object({
  lastName: z.string().trim().min(1, "Le nom est obligatoire").max(100),
  firstName: z.string().trim().min(1, "Le prénom est obligatoire").max(100),
  phone: z.string().trim().min(6, "Le téléphone est obligatoire").max(30),
  city: z.string().trim().min(1, "La ville est obligatoire").max(100),
});

// Un membre de la plateforme OU une personne sans compte (identité minimale) — jamais les deux, jamais aucun.
const createUrgenceDto = z
  .object({
    subServiceId: z.string().min(1, "Choisissez le service"),
    motif: z.string().trim().min(3, "Indiquez le motif").max(500),
    urgenceJustification: z.string().trim().min(3, "Justifiez l'urgence").max(1000),
    userId: z.string().uuid().nullable().optional(),
    visitor: visitorDto.nullable().optional(),
  })
  .refine((v) => !!v.userId !== !!v.visitor, { message: "Indiquez un membre OU l'identité de la personne", path: ["userId"] });

const membersQueryDto = z.object({ q: z.string().trim().min(2, "Saisissez au moins 2 caractères").max(100) });

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

const actorOf = (req: Request) => ({ userId: (req as any).userId as string, roleName: ((req as any).roleName as string | null) ?? null });

export async function getSummary(_req: Request, res: Response) {
  res.json(ok(await svc.summary()));
}

export async function listAppointments(req: Request, res: Response) {
  const parsed = appointmentsQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));
  res.json(ok(await svc.listAppointments(parsed.data)));
}

export async function lookupTicket(req: Request, res: Response) {
  const parsed = lookupQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Numéro de ticket invalide", zodDetails(parsed.error));
  res.json(ok(await svc.lookupTicket(parsed.data.ticket)));
}

export async function validateArrival(req: Request, res: Response) {
  res.json(ok(await svc.validateArrival(req.params.id, actorOf(req)), undefined, "Arrivée validée : l'agent est prévenu."));
}

export async function listWalkIns(req: Request, res: Response) {
  const parsed = walkInListQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));
  res.json(ok(await svc.listWalkIns(parsed.data)));
}

export async function createWalkIn(req: Request, res: Response) {
  const parsed = createWalkInDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));
  res.status(201).json(ok(await svc.createWalkIn(parsed.data, actorOf(req)), undefined, "Demande enregistrée."));
}

export async function updateWalkIn(req: Request, res: Response) {
  const parsed = updateWalkInDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));
  res.json(ok(await svc.updateWalkIn(req.params.id, parsed.data, actorOf(req))));
}

export async function createDossier(req: Request, res: Response) {
  res.status(201).json(ok(await svc.createDossierFromWalkIn(req.params.id, actorOf(req)), undefined, "Dossier créé et rattaché au membre."));
}

export async function createUrgence(req: Request, res: Response) {
  const parsed = createUrgenceDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));
  res.status(201).json(ok(await svc.createUrgence(parsed.data, actorOf(req)), undefined, "Rendez-vous d'urgence créé : les agents du service sont prévenus."));
}

export async function searchMembers(req: Request, res: Response) {
  const parsed = membersQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Recherche invalide", zodDetails(parsed.error));
  res.json(ok(await svc.searchMembers(parsed.data.q)));
}
