interface Actor {
    userId: string;
    roleName: string | null;
}
export declare function createRequest(actor: Actor, data: {
    kind: string;
    category: string;
    subject: string;
    description: string;
    targetSubServiceId?: string;
    targetPermission?: string;
}): Promise<{
    requester: {
        id: string;
        name: string | null;
        email: string | null;
    };
    handledByName: string | null;
    targetSubService: {
        id: string;
        name: string;
    } | null;
    id: string;
    description: string;
    createdAt: Date | null;
    status: string;
    updatedAt: Date | null;
    subject: string;
    category: string;
    requesterUserId: string;
    kind: string;
    targetSubServiceId: string | null;
    targetPermission: string | null;
    adminResponse: string | null;
    handledBy: string | null;
    handledAt: Date | null;
}>;
export declare function listMine(userId: string): Promise<{
    requester: {
        id: string;
        name: string | null;
        email: string | null;
    };
    handledByName: string | null;
    targetSubService: {
        id: string;
        name: string;
    } | null;
    id: string;
    description: string;
    createdAt: Date | null;
    status: string;
    updatedAt: Date | null;
    subject: string;
    category: string;
    requesterUserId: string;
    kind: string;
    targetSubServiceId: string | null;
    targetPermission: string | null;
    adminResponse: string | null;
    handledBy: string | null;
    handledAt: Date | null;
}[]>;
export declare function listAll(filters: {
    status?: string;
    kind?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
}): Promise<{
    data: {
        requester: {
            id: string;
            name: string | null;
            email: string | null;
        };
        handledByName: string | null;
        targetSubService: {
            id: string;
            name: string;
        } | null;
        id: string;
        description: string;
        createdAt: Date | null;
        status: string;
        updatedAt: Date | null;
        subject: string;
        category: string;
        requesterUserId: string;
        kind: string;
        targetSubServiceId: string | null;
        targetPermission: string | null;
        adminResponse: string | null;
        handledBy: string | null;
        handledAt: Date | null;
    }[];
    meta: {
        openCount: number;
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}>;
export declare function getOwnerId(id: string): Promise<string>;
export declare function getRequest(id: string): Promise<{
    requester: {
        id: string;
        name: string | null;
        email: string | null;
    };
    handledByName: string | null;
    targetSubService: {
        id: string;
        name: string;
    } | null;
    id: string;
    description: string;
    createdAt: Date | null;
    status: string;
    updatedAt: Date | null;
    subject: string;
    category: string;
    requesterUserId: string;
    kind: string;
    targetSubServiceId: string | null;
    targetPermission: string | null;
    adminResponse: string | null;
    handledBy: string | null;
    handledAt: Date | null;
}>;
export declare function processRequest(id: string, data: {
    status: string;
    response?: string;
    applyAssignment?: boolean;
}, actor: Actor): Promise<{
    assignmentCreated: boolean;
    requester: {
        id: string;
        name: string | null;
        email: string | null;
    };
    handledByName: string | null;
    targetSubService: {
        id: string;
        name: string;
    } | null;
    id: string;
    description: string;
    createdAt: Date | null;
    status: string;
    updatedAt: Date | null;
    subject: string;
    category: string;
    requesterUserId: string;
    kind: string;
    targetSubServiceId: string | null;
    targetPermission: string | null;
    adminResponse: string | null;
    handledBy: string | null;
    handledAt: Date | null;
}>;
export {};
//# sourceMappingURL=agent-requests.service.d.ts.map