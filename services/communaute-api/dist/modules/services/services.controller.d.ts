import { Request, Response } from "express";
export declare function listServices(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function getService(req: Request, res: Response): Promise<void>;
export declare function getServiceSubServices(req: Request, res: Response): Promise<void>;
export declare function getSubService(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=services.controller.d.ts.map