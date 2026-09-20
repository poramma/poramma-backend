import { Request, Response } from "express";
export declare function listAgendaSlots(req: Request, res: Response): Promise<void>;
export declare function getAgendaSlot(req: Request, res: Response): Promise<void>;
export declare function listRendezVous(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function createRendezVous(req: Request, res: Response): Promise<void>;
export declare function createUrgence(req: Request, res: Response): Promise<void>;
export declare function updateStatus(req: Request, res: Response): Promise<void>;
export declare function checkIn(req: Request, res: Response): Promise<void>;
export declare function complete(req: Request, res: Response): Promise<void>;
export declare function cancel(req: Request, res: Response): Promise<void>;
export declare function printDaily(req: Request, res: Response): Promise<void>;
export declare function printHistory(req: Request, res: Response): Promise<void>;
export declare function reprint(req: Request, res: Response): Promise<void>;
export declare function listNotes(req: Request, res: Response): Promise<void>;
export declare function addNote(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=rendezvous.controller.d.ts.map