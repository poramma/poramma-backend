import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError, ForbiddenError, RateLimitError } from "@poramma/utils";
import { isSessionActive, checkRateLimit } from "@poramma/cache";
import { etudiantsLogic } from "@poramma/ambassade-core";
import { db } from "../db/connection";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

/**
 * Même vérification que identity-api/ambassade-api's requireAuth (même
 * secret JWT, même table de sessions Redis) — un membre de la communauté
 * n'a pas de rôle RBAC (roleLevel 999, permissions vides), ce qui est
 * normal et attendu ici : le contrôle d'accès de ce service repose sur la
 * propriété de la ressource (self-access), pas sur des permissions.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new UnauthorizedError("Non authentifié");

    const token = authHeader.split(" ")[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      throw new UnauthorizedError("Token invalide ou expiré");
    }

    if (!(await isSessionActive(decoded.sessionId))) {
      throw new UnauthorizedError("Session révoquée");
    }

    (req as any).userId = decoded.sub;
    (req as any).roleLevel = decoded.roleLevel ?? 999;
    (req as any).sessionId = decoded.sessionId;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Gate transverse (RÈGLE mission §10.2) : rendez-vous, demandes, threads ne
 * sont ouverts qu'à un profil validé + INUE attribué. Doit être posé APRÈS
 * requireAuth sur chaque route concernée.
 */
export async function requireValidatedProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId as string;
    const status = await etudiantsLogic.getRegistrationStatus(db, userId);
    if (!status.isValidated) {
      throw new ForbiddenError(
        "Vous devez d'abord vous enregistrer auprès de l'ambassade et voir votre dossier validé pour accéder à cette fonctionnalité."
      );
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Limiteur à fenêtre fixe (RÈGLE mission §10.5), clé = utilisateur
 * authentifié, à défaut l'IP (endpoints publics). Réutilise le compteur
 * Redis de @poramma/cache déjà employé pour le login/OTP.
 */
export function rateLimit(name: string, limit: number, windowSeconds: number) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const key = `community:${name}:${(req as any).userId ?? req.ip}`;
      const { allowed } = await checkRateLimit(key, limit, windowSeconds);
      if (!allowed) throw new RateLimitError("Trop de requêtes. Veuillez réessayer plus tard.");
      next();
    } catch (err) {
      next(err);
    }
  };
}
