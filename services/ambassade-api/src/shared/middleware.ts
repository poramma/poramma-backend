import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError, ForbiddenError } from "@poramma/utils";
import { isSessionActive } from "@poramma/cache";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

/**
 * Same JWT_SECRET and payload shape as identity-api (see its
 * shared/middleware.ts) — ambassade-api verifies tokens issued by
 * identity-api without calling back into it: permissions/roleLevel are
 * denormalized into the JWT at login time (mission prompt JWT-02).
 */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  roleLevel: number;
  permissions: string[];
  sessionId: string;
}

/**
 * Also checks Redis for real-time session revocation (JWT-03) — same check
 * identity-api runs, against the same Redis instance, see @poramma/cache's
 * header comment. Async middleware: errors are forwarded to `next()`
 * explicitly since Express 4 does not auto-catch a rejected promise here.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new UnauthorizedError("Non authentifié");

    const token = authHeader.split(" ")[1];
    let decoded: AccessTokenPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as AccessTokenPayload;
    } catch {
      throw new UnauthorizedError("Token invalide ou expiré");
    }

    if (!(await isSessionActive(decoded.sessionId))) {
      throw new UnauthorizedError("Session révoquée");
    }

    (req as any).userId = decoded.sub;
    (req as any).roleId = decoded.roleId ?? null;
    (req as any).roleName = decoded.roleName ?? null;
    (req as any).roleLevel = decoded.roleLevel ?? 999;
    (req as any).permissions = decoded.permissions ?? [];
    (req as any).sessionId = decoded.sessionId;
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePermission(code: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const permissions: string[] = (req as any).permissions || [];
    if (!permissions.includes(code)) {
      throw new ForbiddenError("Permission insuffisante");
    }
    next();
  };
}

export function requireMinLevel(minLevel: number) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const roleLevel: number = (req as any).roleLevel ?? 999;
    if (roleLevel > minLevel) {
      throw new ForbiddenError("Niveau hiérarchique insuffisant");
    }
    next();
  };
}

export function requireRole(...names: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const roleName: string | null = (req as any).roleName ?? null;
    if (!roleName || !names.includes(roleName)) {
      throw new ForbiddenError("Rôle non autorisé");
    }
    next();
  };
}
