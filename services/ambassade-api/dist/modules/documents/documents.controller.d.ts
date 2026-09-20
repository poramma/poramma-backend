import { Request, Response } from "express";
import multer from "multer";
export declare const upload: multer.Multer;
export declare function listCategories(req: Request, res: Response): Promise<void>;
export declare function createCategory(req: Request, res: Response): Promise<void>;
export declare function updateCategory(req: Request, res: Response): Promise<void>;
export declare function deleteCategory(req: Request, res: Response): Promise<void>;
export declare function listDocuments(req: Request, res: Response): Promise<void>;
export declare function getDocument(req: Request, res: Response): Promise<void>;
export declare function uploadDocument(req: Request, res: Response): Promise<void>;
export declare function addVersion(req: Request, res: Response): Promise<void>;
export declare function listVersions(req: Request, res: Response): Promise<void>;
export declare function downloadDocument(req: Request, res: Response): Promise<void>;
export declare function validateDocument(req: Request, res: Response): Promise<void>;
export declare function archiveDocument(req: Request, res: Response): Promise<void>;
export declare function getStats(req: Request, res: Response): Promise<void>;
export declare function listAudit(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=documents.controller.d.ts.map