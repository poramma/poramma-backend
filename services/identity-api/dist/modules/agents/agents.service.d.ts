interface CreateAgentInput {
    email: string;
    password?: string;
    phone?: string | null;
    firstName: string;
    lastName: string;
    matricule: string;
    roleTitle?: string | null;
    department: string;
    officeNumber?: string | null;
    roleId: string;
    active?: boolean;
}
export declare function listAgents(filters: {
    search?: string;
    department?: string;
}): Promise<{
    id: string;
    userId: string;
    user: import("../auth/auth.service").FullUser;
    matricule: string;
    roleTitle: string | null;
    department: string;
    officeNumber: string | null;
    signatureUrl: string | null;
    active: boolean | null;
    hiredAt: Date;
    createdAt: Date | null;
    updatedAt: Date | null;
    assignments: unknown[];
    availabilities: unknown[];
}[]>;
export declare function getAgent(id: string): Promise<{
    id: string;
    userId: string;
    user: import("../auth/auth.service").FullUser;
    matricule: string;
    roleTitle: string | null;
    department: string;
    officeNumber: string | null;
    signatureUrl: string | null;
    active: boolean | null;
    hiredAt: Date;
    createdAt: Date | null;
    updatedAt: Date | null;
    assignments: unknown[];
    availabilities: unknown[];
}>;
export declare function createAgent(data: CreateAgentInput, createdBy: string): Promise<{
    id: string;
    userId: string;
    user: import("../auth/auth.service").FullUser;
    matricule: string;
    roleTitle: string | null;
    department: string;
    officeNumber: string | null;
    signatureUrl: string | null;
    active: boolean | null;
    hiredAt: Date;
    createdAt: Date | null;
    updatedAt: Date | null;
    assignments: unknown[];
    availabilities: unknown[];
}>;
export declare function updateAgent(id: string, data: Partial<{
    email: string;
    phone: string | null;
    firstName: string;
    lastName: string;
    matricule: string;
    roleTitle: string | null;
    department: string;
    officeNumber: string | null;
    active: boolean;
}>): Promise<{
    id: string;
    userId: string;
    user: import("../auth/auth.service").FullUser;
    matricule: string;
    roleTitle: string | null;
    department: string;
    officeNumber: string | null;
    signatureUrl: string | null;
    active: boolean | null;
    hiredAt: Date;
    createdAt: Date | null;
    updatedAt: Date | null;
    assignments: unknown[];
    availabilities: unknown[];
}>;
export declare function deleteAgent(id: string, callerUserId: string): Promise<void>;
export {};
//# sourceMappingURL=agents.service.d.ts.map