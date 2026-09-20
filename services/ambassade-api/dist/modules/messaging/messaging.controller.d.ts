import { Request, Response } from "express";
import multer from "multer";
export declare const upload: multer.Multer;
export declare function listThreads(req: Request, res: Response): Promise<void>;
export declare function getThread(req: Request, res: Response): Promise<void>;
export declare function createThread(req: Request, res: Response): Promise<void>;
export declare function addParticipant(req: Request, res: Response): Promise<void>;
export declare function updateThreadStatus(req: Request, res: Response): Promise<void>;
export declare function listMessages(req: Request, res: Response): Promise<void>;
export declare function sendMessage(req: Request, res: Response): Promise<void>;
export declare function markThreadRead(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=messaging.controller.d.ts.map