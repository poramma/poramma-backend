import { Request, Response } from "express";
import { etudiantsLogic, registrationLogic } from "@poramma/ambassade-core";
import { ok } from "@poramma/dto";
import { db } from "../../db/connection";

const userIdOf = (req: Request) => (req as any).userId as string;

/**
 * Statut d'inscription communautaire (RÈGLE mission §3) — ne renvoie que ce
 * qui est propre à communaute-api (statut de validation, INUE) ; les champs
 * d'identité (nom, email, profil académique...) restent consultés/modifiés
 * directement sur identity-api (GET /auth/me, PATCH /users/me/:id/*), pas
 * dupliqués ici.
 */
export async function getProfileStatus(req: Request, res: Response) {
  const status = await etudiantsLogic.getRegistrationStatus(db, userIdOf(req));
  res.json(ok(status));
}

/** Dossier d'enregistrement : statut + ce qui manque (informations, pièces). */
export async function getRegistration(req: Request, res: Response) {
  res.json(ok(await registrationLogic.getRegistrationChecklist(db, userIdOf(req))));
}

/** Soumet le dossier à l'ambassade (INCOMPLETE ou REJECTED → SUBMITTED). */
export async function submitRegistration(req: Request, res: Response) {
  const checklist = await registrationLogic.submitRegistration(db, userIdOf(req));
  res.json(ok(checklist, undefined, "Votre dossier d'enregistrement a bien été reçu par l'ambassade."));
}
