import { Request, Response } from "express";
import { ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";
import { supportLogic } from "@poramma/ambassade-core";
import { db } from "../../db/connection";
import { sanitizeText } from "../../shared/sanitize";

// Validation manuelle : communaute-api ne déclare pas zod (les DTO partagés vivent dans @poramma/dto,
// dont la modification obligerait à reconstruire tous les services pour un simple formulaire).
function parseTicketBody(body: any) {
  const errors: Record<string, string[]> = {};
  const category = typeof body?.category === "string" ? body.category : "";
  const subject = typeof body?.subject === "string" ? sanitizeText(body.subject) : "";
  const message = typeof body?.message === "string" ? sanitizeText(body.message) : "";
  const reference = typeof body?.reference === "string" ? sanitizeText(body.reference) : "";
  if (!(supportLogic.TICKET_CATEGORIES as readonly string[]).includes(category)) errors.category = ["Choisissez la nature de votre demande"];
  if (subject.length < 3 || subject.length > 150) errors.subject = ["L'objet doit contenir entre 3 et 150 caractères"];
  if (message.length < 10 || message.length > 3000) errors.message = ["Décrivez votre demande en quelques phrases (10 à 3000 caractères)"];
  if (reference.length > 60) errors.reference = ["Référence trop longue"];
  if (Object.keys(errors).length) throw new ValidationError("Données invalides", errors);
  return { category, subject, message, linkedReference: reference || null };
}

function parseMessage(body: any): string {
  const content = typeof body?.content === "string" ? sanitizeText(body.content) : "";
  if (content.length < 1 || content.length > 3000) throw new ValidationError("Données invalides", { content: ["Le message doit contenir entre 1 et 3000 caractères"] });
  return content;
}

const userIdOf = (req: Request) => (req as any).userId as string;

/** POST /support — ouvre un ticket (accessible à tout compte connecté, validé ou non). */
export async function createTicket(req: Request, res: Response) {
  const ticket = await supportLogic.createTicket(db, userIdOf(req), parseTicketBody(req.body));
  res.status(201).json(ok({ id: ticket.id, ticket: ticket.reference }, undefined, "Votre message a été transmis à l'ambassade."));
}

/** GET /support/tickets — mes tickets. */
export async function listMyTickets(req: Request, res: Response) {
  res.json(ok(await supportLogic.listTicketsForUser(db, userIdOf(req))));
}

/** GET /support/tickets/:id — un de mes tickets avec son fil (notes internes exclues, agents jamais nommés). */
export async function getMyTicket(req: Request, res: Response) {
  res.json(ok(await supportLogic.getTicketForUser(db, userIdOf(req), req.params.id)));
}

/** POST /support/tickets/:id/messages — je réponds sur mon ticket. */
export async function replyToMyTicket(req: Request, res: Response) {
  res.status(201).json(ok(await supportLogic.addUserMessage(db, userIdOf(req), req.params.id, parseMessage(req.body))));
}

/** POST /support/tickets/:id/resolve — je marque mon ticket comme résolu. */
export async function resolveMyTicket(req: Request, res: Response) {
  res.json(ok(await supportLogic.resolveByUser(db, userIdOf(req), req.params.id)));
}
