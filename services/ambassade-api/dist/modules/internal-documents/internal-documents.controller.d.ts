import { Request, Response } from "express";
import multer from "multer";
export declare const upload: multer.Multer;
export declare function listInternalDocuments(req: Request, res: Response): Promise<void>;
export declare function getInternalDocument(req: Request, res: Response): Promise<void>;
export declare function createInternalDocument(req: Request, res: Response): Promise<void>;
export declare function shareInternalDocument(req: Request, res: Response): Promise<void>;
export declare function downloadInternalDocument(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=internal-documents.controller.d.ts.map