import { Request, Response } from "express";
import multer from "multer";
export declare const upload: multer.Multer;
export declare function listMyDocuments(req: Request, res: Response): Promise<void>;
export declare function getDocument(req: Request, res: Response): Promise<void>;
export declare function uploadDocument(req: Request, res: Response): Promise<void>;
export declare function downloadDocument(req: Request, res: Response): Promise<void>;
export declare function deleteDocument(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=documents.controller.d.ts.map