export declare function listRoles(): Promise<{
    permissions: {
        id: string;
        code: string;
        name: string;
        description: string | null;
        resource: string;
        action: string;
        category: string | null;
    }[];
    id: string;
    name: string;
    description: string | null;
    level: number;
    isSystem: boolean | null;
}[]>;
export declare function getRole(id: string): Promise<{
    permissions: {
        id: string;
        code: string;
        name: string;
        description: string | null;
        resource: string;
        action: string;
        category: string | null;
    }[];
    id: string;
    name: string;
    description: string | null;
    level: number;
    isSystem: boolean | null;
}>;
export declare function createRole(data: {
    name: string;
    description: string;
    level: number;
    isSystem?: boolean;
}): Promise<{
    permissions: never[];
    id: string;
    name: string;
    description: string | null;
    level: number;
    isSystem: boolean | null;
}>;
export declare function updateRole(id: string, data: Partial<{
    name: string;
    description: string;
    level: number;
}>): Promise<{
    permissions: {
        id: string;
        code: string;
        name: string;
        description: string | null;
        resource: string;
        action: string;
        category: string | null;
    }[];
    id: string;
    name: string;
    description: string | null;
    level: number;
    isSystem: boolean | null;
}>;
export declare function deleteRole(id: string): Promise<void>;
export declare function listPermissions(): Promise<{
    id: string;
    code: string;
    name: string;
    description: string | null;
    resource: string;
    action: string;
    category: string | null;
    minRoleLevel: number;
}[]>;
export declare function assignPermissionToRole(roleId: string, permissionCode: string): Promise<void>;
export declare function removePermissionFromRole(roleId: string, permissionCode: string): Promise<void>;
export declare function assignRoleToUser(targetUserId: string, roleId: string, assignedBy: string): Promise<{
    id: string;
    roleId: string;
    userId: string;
    assignedBy: string | null;
    assignedAt: Date | null;
    expiresAt: Date | null;
    isActive: boolean | null;
}>;
export declare function removeRoleFromUser(targetUserId: string, roleId: string, callerUserId: string): Promise<void>;
//# sourceMappingURL=roles.service.d.ts.map