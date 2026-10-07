import { healthLogic } from "@poramma/ambassade-core";
export declare function overview(): Promise<{
    members: Record<string, any>;
    byUserType: {
        [k: string]: number;
    };
    byRegistration: {
        [k: string]: number;
    };
    activity: {
        logins24h: any;
        failedLogins24h: any;
        criticalEvents24h: any;
        activeMembers24h: any;
    };
    series: {
        registrations: Record<string, any>[];
        logins: Record<string, any>[];
    };
    support: Record<string, any>;
}>;
export interface MemberFilters {
    search?: string;
    status?: string;
    userType?: string;
    registration?: string;
    page: number;
    limit: number;
}
export declare function listMembers(f: MemberFilters): Promise<{
    data: Record<string, any>[];
    total: number;
}>;
export declare function getMember(id: string): Promise<{
    counts: Record<string, any>;
    sessions: Record<string, any>[];
    recentActivity: Record<string, any>[];
}>;
export declare function systemStatus(): Promise<{
    checkedAt: string;
    components: {
        database: healthLogic.Probe;
        redis: healthLogic.Probe;
        storage: healthLogic.Probe;
        mail: {
            configured: boolean;
            provider: string | null;
        };
    };
    runtime: {
        service: string;
        node: string;
        environment: string;
        uptimeSeconds: number;
        memoryMb: number;
    };
}>;
//# sourceMappingURL=admin.service.d.ts.map