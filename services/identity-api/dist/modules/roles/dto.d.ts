import { z } from "zod";
export declare const createRoleDto: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodString;
    level: z.ZodNumber;
    isSystem: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    level: number;
    isSystem?: boolean | undefined;
}, {
    name: string;
    description: string;
    level: number;
    isSystem?: boolean | undefined;
}>;
export declare const updateRoleDto: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    level: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    level?: number | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    level?: number | undefined;
}>;
export declare const assignPermissionDto: z.ZodObject<{
    permissionCode: z.ZodString;
}, "strip", z.ZodTypeAny, {
    permissionCode: string;
}, {
    permissionCode: string;
}>;
export declare const assignRoleToUserDto: z.ZodObject<{
    roleId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roleId: string;
}, {
    roleId: string;
}>;
//# sourceMappingURL=dto.d.ts.map