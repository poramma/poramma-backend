import { Request, Response, NextFunction } from "express";
export declare function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function requireValidatedProfile(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare function rateLimit(name: string, limit: number, windowSeconds: number): (req: Request, _res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=middleware.d.ts.map