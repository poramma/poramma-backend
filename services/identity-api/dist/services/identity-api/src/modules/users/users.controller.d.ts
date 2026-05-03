import { Request, Response } from "express";
export declare function getUser(req: Request, res: Response): Promise<void>;
export declare function getUserProfile(req: Request, res: Response): Promise<void>;
export declare function updateUserStatus(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function updatePersonalInfo(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function updateAddress(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function updateStudentProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
export declare function updateWorkerProfile(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=users.controller.d.ts.map