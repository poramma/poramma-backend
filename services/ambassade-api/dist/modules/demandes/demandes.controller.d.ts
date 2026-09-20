import { Request, Response } from "express";
export declare function listDemandes(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getDemande(req: Request, res: Response): Promise<void>;
export declare function createDemande(req: Request, res: Response): Promise<void>;
export declare function updateStatus(req: Request, res: Response): Promise<void>;
export declare function assignAgent(req: Request, res: Response): Promise<void>;
export declare function listHistory(req: Request, res: Response): Promise<void>;
export declare function listComments(req: Request, res: Response): Promise<void>;
export declare function addComment(req: Request, res: Response): Promise<void>;
export declare function listRequirements(req: Request, res: Response): Promise<void>;
export declare function listDemandeDocuments(req: Request, res: Response): Promise<void>;
export declare function validateRequirement(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=demandes.controller.d.ts.map