import { Request, Response } from "express";
import { cultureLogic, demandesLogic, servicesLogic } from "@poramma/ambassade-core";
import { communityDemandesDto, ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";
import { db } from "../../db/connection";
import {
  toPublicDemande,
  toPublicHistory,
  toPublicComment,
  toPublicRequirement,
  toPublicDemandeDocument,
} from "../../shared/public-mappers";
import { sanitizeDeep, sanitizeText } from "../../shared/sanitize";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

const userIdOf = (req: Request) => (req as any).userId as string;

async function publicDemande(row: any) {
  const sub = await servicesLogic.getSubServiceShallow(db, row.subServiceId);
  // Espace culturel : la demande est traitée à visage découvert par le Conseiller Culturel.
  const advisor = sub?.service?.isCultural ? await cultureLogic.advisorByAgentId(db, row.assignedAgentId) : null;
  return toPublicDemande(row, sub, advisor);
}

/** Vrai si la demande relève de l'espace culturel (les messages du conseiller y sont signés de son nom). */
async function isCulturalDemande(row: { subServiceId: string }): Promise<boolean> {
  const sub = await servicesLogic.getSubServiceShallow(db, row.subServiceId);
  return sub?.service?.isCultural === true;
}

export async function listMyDemandes(req: Request, res: Response) {
  const rows = await demandesLogic.listDemandesByUser(db, userIdOf(req));
  res.json(ok(await Promise.all(rows.map(publicDemande))));
}

export async function getDemande(req: Request, res: Response) {
  const row = await demandesLogic.getOwnedDemande(db, req.params.id, userIdOf(req));
  res.json(ok(await publicDemande(row)));
}

/**
 * Création d'une demande par un membre validé. Les pièces ont déjà été
 * téléversées (POST /documents) et sont jointes ici en une seule transaction ;
 * les pièces obligatoires du sous-service sont exigées côté serveur, quoi que
 * le frontend affiche.
 */
export async function createDemande(req: Request, res: Response) {
  const parsed = communityDemandesDto.createDemandeDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const row = await demandesLogic.createDemande(db, {
    userId: userIdOf(req),
    subServiceId: parsed.data.subServiceId,
    customPayload: parsed.data.customPayload ? sanitizeDeep(parsed.data.customPayload) : null,
    documents: parsed.data.documents,
    enforceRequiredDocuments: true,
  });
  res.status(201).json(ok(await publicDemande(row)));
}

export async function listHistory(req: Request, res: Response) {
  await demandesLogic.getOwnedDemande(db, req.params.id, userIdOf(req));
  const history = await demandesLogic.listHistory(db, req.params.id);
  res.json(ok(history.filter((h) => h.isVisibleToUser).map(toPublicHistory)));
}

export async function listComments(req: Request, res: Response) {
  const demande = await demandesLogic.getOwnedDemande(db, req.params.id, userIdOf(req));
  const reveal = await isCulturalDemande(demande);
  const comments = await demandesLogic.listComments(db, req.params.id);
  res.json(ok(comments.filter((c) => !c.isInternal).map((c) => toPublicComment(c, reveal))));
}

export async function addComment(req: Request, res: Response) {
  const parsed = communityDemandesDto.addCommentDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));
  const content = sanitizeText(parsed.data.content);
  if (!content) throw new ValidationError("Données invalides", { content: ["Message vide"] });

  await demandesLogic.getOwnedDemande(db, req.params.id, userIdOf(req));
  const comment = await demandesLogic.addComment(db, req.params.id, content, false, { userId: userIdOf(req), roleName: null }, false);
  res.status(201).json(ok(toPublicComment(comment)));
}

export async function listRequirements(req: Request, res: Response) {
  await demandesLogic.getOwnedDemande(db, req.params.id, userIdOf(req));
  const reqs = await demandesLogic.listRequirements(db, req.params.id);
  res.json(ok(reqs.map(toPublicRequirement)));
}

export async function listDemandeDocuments(req: Request, res: Response) {
  await demandesLogic.getOwnedDemande(db, req.params.id, userIdOf(req));
  const docs = await demandesLogic.listDemandeDocuments(db, req.params.id);
  res.json(ok(docs.map(toPublicDemandeDocument)));
}
