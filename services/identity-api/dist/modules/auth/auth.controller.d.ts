import { Request, Response } from "express";
export declare function register(req: Request, res: Response): Promise<void>;
export declare function sendOtp(req: Request, res: Response): Promise<void>;
export declare function verifyOtp(req: Request, res: Response): Promise<void>;
export declare function login(req: Request, res: Response): Promise<void>;
export declare function refresh(req: Request, res: Response): Promise<void>;
export declare function logout(req: Request, res: Response): Promise<void>;
export declare function me(req: Request, res: Response): Promise<void>;
export declare function updateProfile(req: Request, res: Response): Promise<void>;
export declare function getRoles(_req: Request, res: Response): Promise<void>;
export declare function getPermissions(req: Request, res: Response): Promise<void>;
export declare function switchRole(req: Request, res: Response): Promise<void>;
export declare function forgotPassword(req: Request, res: Response): Promise<void>;
export declare function resetPassword(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map