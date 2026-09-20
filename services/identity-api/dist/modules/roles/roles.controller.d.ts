import { Request, Response } from "express";
export declare function getRoles(_req: Request, res: Response): Promise<void>;
export declare function getRole(req: Request, res: Response): Promise<void>;
export declare function createRole(req: Request, res: Response): Promise<void>;
export declare function updateRole(req: Request, res: Response): Promise<void>;
export declare function deleteRole(req: Request, res: Response): Promise<void>;
export declare function getPermissions(_req: Request, res: Response): Promise<void>;
export declare function assignPermissionToRole(req: Request, res: Response): Promise<void>;
export declare function removePermissionFromRole(req: Request, res: Response): Promise<void>;
export declare function assignRoleToUser(req: Request, res: Response): Promise<void>;
export declare function removeRoleFromUser(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=roles.controller.d.ts.map