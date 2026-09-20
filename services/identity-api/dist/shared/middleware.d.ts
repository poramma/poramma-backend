import { Request, Response, NextFunction } from "express";
export interface AccessTokenPayload {
    sub: string;
    email: string;
    roleId: string | null;
    roleName: string | null;
    roleLevel: number;
    permissions: string[];
    sessionId: string;
}
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function requirePermission(code: string): (req: Request, _res: Response, next: NextFunction) => void;
export declare function requireMinLevel(minLevel: number): (req: Request, _res: Response, next: NextFunction) => void;
export declare function requireRole(...names: string[]): (req: Request, _res: Response, next: NextFunction) => void;
//# sourceMappingURL=middleware.d.ts.map