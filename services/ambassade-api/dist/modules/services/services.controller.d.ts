import { Request, Response } from "express";
export declare function listServices(_req: Request, res: Response): Promise<void>;
export declare function getService(req: Request, res: Response): Promise<void>;
export declare function createService(req: Request, res: Response): Promise<void>;
export declare function updateService(req: Request, res: Response): Promise<void>;
export declare function deleteService(req: Request, res: Response): Promise<void>;
export declare function getServiceSubServices(req: Request, res: Response): Promise<void>;
export declare function getSubService(req: Request, res: Response): Promise<void>;
export declare function createSubService(req: Request, res: Response): Promise<void>;
export declare function updateSubService(req: Request, res: Response): Promise<void>;
export declare function createSchedule(req: Request, res: Response): Promise<void>;
export declare function updateSchedule(req: Request, res: Response): Promise<void>;
export declare function deleteSchedule(req: Request, res: Response): Promise<void>;
export declare function createException(req: Request, res: Response): Promise<void>;
export declare function deleteException(req: Request, res: Response): Promise<void>;
export declare function addRequirement(req: Request, res: Response): Promise<void>;
export declare function updateRequirement(req: Request, res: Response): Promise<void>;
export declare function removeRequirement(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=services.controller.d.ts.map