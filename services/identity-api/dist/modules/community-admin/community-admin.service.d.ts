export declare const TEAM_ROLES: readonly ["COMMUNITY_ADMIN", "COMMUNITY_SUPPORT"];
export type TeamRole = (typeof TEAM_ROLES)[number];
interface Caller {
    userId: string;
    roleName: string | null;
}
export declare function setMemberStatus(targetId: string, status: "SUSPENDED" | "ACTIVE", caller: Caller, reason: string | null, ip?: string | null, ua?: string | null): Promise<{
    id: string;
    status: string;
}>;
export declare function listTeam(): Promise<{
    name: string;
    userId: string;
    email: string;
    status: string | null;
    firstName: string | null;
    lastName: string | null;
    role: string;
    assignedAt: Date | null;
}[]>;
export declare function addTeamMember(email: string, roleName: TeamRole, caller: Caller, ip?: string | null, ua?: string | null): Promise<{
    userId: string;
    role: "COMMUNITY_ADMIN" | "COMMUNITY_SUPPORT";
}>;
export declare function changeTeamRole(targetId: string, roleName: TeamRole, caller: Caller, ip?: string | null, ua?: string | null): Promise<{
    userId: string;
    role: "COMMUNITY_ADMIN" | "COMMUNITY_SUPPORT";
}>;
export declare function removeTeamMember(targetId: string, caller: Caller, ip?: string | null, ua?: string | null): Promise<void>;
export {};
//# sourceMappingURL=community-admin.service.d.ts.map