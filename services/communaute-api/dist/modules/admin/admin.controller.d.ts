import { Request, Response } from "express";
export declare function overview(_req: Request, res: Response): Promise<void>;
export declare function systemStatus(_req: Request, res: Response): Promise<void>;
export declare function listMembers(req: Request, res: Response): Promise<void>;
export declare function getMember(req: Request, res: Response): Promise<void>;
export declare function listAuditLogs(req: Request, res: Response): Promise<void>;
export declare function getAuditLog(req: Request, res: Response): Promise<void>;
export declare function auditStats(_req: Request, res: Response): Promise<void>;
export declare function exportAuditLogs(req: Request, res: Response): Promise<void>;
export declare function listTickets(req: Request, res: Response): Promise<void>;
export declare function listAssignees(_req: Request, res: Response): Promise<void>;
export declare function getTicket(req: Request, res: Response): Promise<void>;
export declare function addTicketMessage(req: Request, res: Response): Promise<void>;
export declare function updateTicket(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=admin.controller.d.ts.map