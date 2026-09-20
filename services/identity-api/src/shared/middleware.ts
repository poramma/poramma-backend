import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError, ForbiddenError } from "@poramma/utils";
import { isSessionActive } from "@poramma/cache";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

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
 * Verifies the JWT and exposes the decoded RBAC context on the request:
 * userId, roleId, roleName, roleLevel, permissions, sessionId. A user with
 * no assigned role (public/community accounts) gets roleLevel = 999 (below
 * every real role) and an empty permissions array.
 *
 * Also checks Redis for real-time session revocation (JWT-03): the JWT's
 * own 15min expiry alone isn't enough — a logout, a suspended account, or a
 * refresh-rotation must invalidate the access token immediately, not just
 * once it naturally expires. `isSessionActive` is the same check
 * ambassade-api runs independently against the same Redis instance (see
 * @poramma/cache's header comment). Async, so wired directly (not via
 * asyncHandler, which wraps route handlers, not middleware registered with
 * router.use) — errors are forwarded to `next()` explicitly since Express 4
 * does not auto-catch a rejected promise from an async middleware.
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

/** Requires a specific permission code (e.g. "service:admin") on the caller. */
export function requirePermission(code: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const permissions: string[] = (req as any).permissions || [];
    if (!permissions.includes(code)) {
      throw new ForbiddenError("Permission insuffisante");
    }
    next();
  };
}

/** Requires the caller's role level to be at or above (numerically <=) minLevel. */
export function requireMinLevel(minLevel: number) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const roleLevel: number = (req as any).roleLevel ?? 999;
    if (roleLevel > minLevel) {
      throw new ForbiddenError("Niveau hiérarchique insuffisant");
    }
    next();
  };
}

/** Requires the caller's role name to be one of the given RoleName values. */
export function requireRole(...names: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const roleName: string | null = (req as any).roleName ?? null;
    if (!roleName || !names.includes(roleName)) {
      throw new ForbiddenError("Rôle non autorisé");
    }
    next();
  };
}
