import { Request, Response } from "express";
import multer from "multer";
export declare const uploadSignatureMiddleware: multer.Multer;
export declare function getMyProfile(req: Request, res: Response): Promise<void>;
export declare function updateMyProfile(req: Request, res: Response): Promise<void>;
export declare function updateMyPreferences(req: Request, res: Response): Promise<void>;
export declare function updateMyPassword(req: Request, res: Response): Promise<void>;
export declare function uploadSignature(req: Request, res: Response): Promise<void>;
export declare function getSignature(req: Request, res: Response): Promise<void>;
export declare function deleteSignature(req: Request, res: Response): Promise<void>;
export declare function getMyActivities(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=profile.controller.d.ts.map