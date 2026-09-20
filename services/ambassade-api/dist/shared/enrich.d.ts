export declare const getActorName: (userId: string) => Promise<string>;
export declare const getUser: (userId: string) => Promise<{
    profile: ({
        id: string;
        userId: string;
        inue: string | null;
        userType: string | null;
        firstName: string | null;
        lastName: string | null;
        nationality: string | null;
        address: string | null;
        city: string | null;
        country: string | null;
    } & {
        inue: string | null;
    }) | null;
    id: string;
    email: string;
    phone: string | null;
    status: string | null;
    createdAt: Date | null;
} | null>;
export declare function getAgent(agentId: string): Promise<{
    user: {
        profile: ({
            id: string;
            userId: string;
            inue: string | null;
            userType: string | null;
            firstName: string | null;
            lastName: string | null;
            nationality: string | null;
            address: string | null;
            city: string | null;
            country: string | null;
        } & {
            inue: string | null;
        }) | null;
        id: string;
        email: string;
        phone: string | null;
        status: string | null;
        createdAt: Date | null;
    } | null;
    id: string;
    userId: string;
    matricule: string | null;
    roleTitle: string | null;
    department: string | null;
    officeNumber: string | null;
    active: boolean | null;
} | null>;
export declare function getAgentByUserId(userId: string): Promise<{
    user: {
        profile: ({
            id: string;
            userId: string;
            inue: string | null;
            userType: string | null;
            firstName: string | null;
            lastName: string | null;
            nationality: string | null;
            address: string | null;
            city: string | null;
            country: string | null;
        } & {
            inue: string | null;
        }) | null;
        id: string;
        email: string;
        phone: string | null;
        status: string | null;
        createdAt: Date | null;
    } | null;
    id: string;
    userId: string;
    matricule: string | null;
    roleTitle: string | null;
    department: string | null;
    officeNumber: string | null;
    active: boolean | null;
} | null>;
export declare function getSubServiceShallow(id: string): Promise<{
    basePrice: number | null;
    service: {
        id: string;
        name: string;
        code: string;
        description: string | null;
        icon: string | null;
        order: number | null;
        active: boolean | null;
        requiresAppointment: boolean | null;
        isCultural: boolean;
        createdAt: Date | null;
    };
    id: string;
    serviceId: string;
    name: string;
    code: string;
    description: string | null;
    active: boolean | null;
    currency: string | null;
    slaDays: number;
    allowCustomRequest: boolean | null;
    requiresInPerson: boolean | null;
    createdAt: Date | null;
} | null>;
export declare function getAssignedSubServiceIds(userId: string): Promise<string[]>;
//# sourceMappingURL=enrich.d.ts.map