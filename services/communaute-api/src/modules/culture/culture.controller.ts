import { Request, Response } from "express";
import { ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";
import { cultureLogic, servicesLogic } from "@poramma/ambassade-core";
import { db } from "../../db/connection";
import { toPublicAdvisor } from "../../shared/public-mappers";
import { sanitizeText } from "../../shared/sanitize";

// Validation manuelle : communaute-api ne déclare pas zod (voir support.controller.ts).
function parseThreadBody(body: any) {
  const errors: Record<string, string[]> = {};
  const subject = typeof body?.subject === "string" ? sanitizeText(body.subject) : "";
  const message = typeof body?.message === "string" ? sanitizeText(body.message) : "";
  if (subject.length < 3 || subject.length > 150) errors.subject = ["L'objet doit contenir entre 3 et 150 caractères"];
  if (message.length < 10 || message.length > 3000) errors.message = ["Écrivez votre message en quelques phrases (10 à 3000 caractères)"];
  if (Object.keys(errors).length) throw new ValidationError("Données invalides", errors);
  return { subject, message };
}

function parseMessage(body: any): string {
  const content = typeof body?.content === "string" ? sanitizeText(body.content) : "";
  if (content.length < 1 || content.length > 3000) throw new ValidationError("Données invalides", { content: ["Le message doit contenir entre 1 et 3000 caractères"] });
  return content;
}

const userIdOf = (req: Request) => (req as any).userId as string;

/**
 * GET /culture — présentation de l'espace culturel : le(s) Conseiller(s) Culturel(s) à visage
 * découvert (nom + fonction, jamais d'identifiant) et les prestations proposées.
 */
export async function overview(_req: Request, res: Response) {
  const [advisors, all] = await Promise.all([cultureLogic.listAdvisors(db), servicesLogic.listServices(db)]);
  const cultural = all.filter((s: any) => s.isCultural && s.active);
  res.json(
    ok({
      advisors: advisors.map(toPublicAdvisor),
      services: cultural.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        subServices: (s.subServices ?? [])
          .filter((sub: any) => sub.active)
          .map((sub: any) => ({
            id: sub.id,
            name: sub.name,
            description: sub.description,
            slaDays: sub.slaDays,
            // Horaires d'ouverture (pour afficher les permanences avant de réserver).
            schedules: (sub.schedules ?? []).map((h: any) => ({ dayOfWeek: h.dayOfWeek, startTime: h.startTime, endTime: h.endTime, isActive: h.isActive })),
            // Une prestation « sur rendez-vous » se réserve ; les autres se déposent comme une demande.
            kind: sub.requiresInPerson ? "RENDEZ_VOUS" : "DEMANDE",
          })),
      })),
    })
  );
}

/** POST /culture/threads — j'écris au Conseiller Culturel. */
export async function createThread(req: Request, res: Response) {
  const thread = await cultureLogic.createThread(db, userIdOf(req), parseThreadBody(req.body));
  res.status(201).json(ok(thread, undefined, "Votre message a été transmis au Conseiller Culturel."));
}

export async function listMyThreads(req: Request, res: Response) {
  res.json(ok(await cultureLogic.listThreadsForUser(db, userIdOf(req))));
}

export async function getMyThread(req: Request, res: Response) {
  res.json(ok(await cultureLogic.getThreadForUser(db, userIdOf(req), req.params.id)));
}

export async function replyToMyThread(req: Request, res: Response) {
  res.status(201).json(ok(await cultureLogic.addUserMessage(db, userIdOf(req), req.params.id, parseMessage(req.body))));
}
