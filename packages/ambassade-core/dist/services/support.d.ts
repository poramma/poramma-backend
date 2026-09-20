import type { Db } from "../db-type";
export declare const TICKET_CATEGORIES: readonly ["ACCOUNT", "DEMANDE", "RENDEZ_VOUS", "REGISTRATION", "TECHNICAL", "OTHER"];
export declare const TICKET_STATUSES: readonly ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"];
export declare const TICKET_PRIORITIES: readonly ["LOW", "NORMAL", "HIGH", "URGENT"];
export declare function listAdminIds(db: Db): Promise<string[]>;
export declare function listAssignees(db: Db): Promise<{
    id: string;
    name: string;
}[]>;
export declare function createTicket(db: Db, userId: string, data: {
    category: string;
    subject: string;
    message: string;
    linkedReference?: string | null;
}): Promise<{
    id: string;
    reference: string;
    subject: string;
    category: string;
    linkedReference: string | null;
    status: string;
    createdAt: Date | null;
    lastMessageAt: Date | null;
    lastMessageBy: string;
    resolvedAt: Date | null;
}>;
export declare function listTicketsForUser(db: Db, userId: string): Promise<{
    id: string;
    reference: string;
    subject: string;
    category: string;
    linkedReference: string | null;
    status: string;
    createdAt: Date | null;
    lastMessageAt: Date | null;
    lastMessageBy: string;
    resolvedAt: Date | null;
}[]>;
export declare function getTicketForUser(db: Db, userId: string, id: string): Promise<{
    messages: {
        id: string;
        authorType: "USER" | "STAFF" | "SYSTEM";
        authorName: string | null;
        content: string;
        createdAt: Date | null;
    }[];
    id: string;
    reference: string;
    subject: string;
    category: string;
    linkedReference: string | null;
    status: string;
    createdAt: Date | null;
    lastMessageAt: Date | null;
    lastMessageBy: string;
    resolvedAt: Date | null;
}>;
export declare function addUserMessage(db: Db, userId: string, id: string, content: string): Promise<{
    id: string;
    authorType: "USER" | "STAFF" | "SYSTEM";
    authorName: string | null;
    content: string;
    createdAt: Date | null;
}>;
export declare function resolveByUser(db: Db, userId: string, id: string): Promise<{
    id: string;
    reference: string;
    subject: string;
    category: string;
    linkedReference: string | null;
    status: string;
    createdAt: Date | null;
    lastMessageAt: Date | null;
    lastMessageBy: string;
    resolvedAt: Date | null;
}>;
export interface TicketFilters {
    status?: string;
    category?: string;
    priority?: string;
    assigned?: string;
    search?: string;
    page?: number;
    limit?: number;
}
export declare function listTickets(db: Db, actorId: string, filters: TicketFilters): Promise<{
    data: {
        id: string;
        reference: string;
        subject: string;
        category: string;
        linkedReference: string | null;
        status: string;
        priority: string;
        requester: {
            id: string;
            name: string | null;
            email: string | null;
            phone: string | null;
            inue: string | null;
        };
        assignee: {
            id: string;
            name: string | null;
        } | null;
        createdAt: Date | null;
        lastMessageAt: Date | null;
        lastMessageBy: string;
        firstResponseAt: Date | null;
        resolvedAt: Date | null;
        closedAt: Date | null;
    }[];
    total: number;
    page: number;
    limit: number;
    stats: {
        open: number;
        inProgress: number;
        waitingUser: number;
        resolved: number;
        closed: number;
        unassigned: number;
        mine: number;
    };
}>;
export declare function getTicketForStaff(db: Db, id: string): Promise<{
    messages: {
        id: string;
        authorType: string;
        authorName: string | null;
        content: string;
        isInternal: boolean;
        createdAt: Date | null;
    }[];
    id: string;
    reference: string;
    subject: string;
    category: string;
    linkedReference: string | null;
    status: string;
    priority: string;
    requester: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        inue: string | null;
    };
    assignee: {
        id: string;
        name: string | null;
    } | null;
    createdAt: Date | null;
    lastMessageAt: Date | null;
    lastMessageBy: string;
    firstResponseAt: Date | null;
    resolvedAt: Date | null;
    closedAt: Date | null;
}>;
export declare function addStaffMessage(db: Db, id: string, actorId: string, content: string, isInternal: boolean): Promise<{
    messages: {
        id: string;
        authorType: string;
        authorName: string | null;
        content: string;
        isInternal: boolean;
        createdAt: Date | null;
    }[];
    id: string;
    reference: string;
    subject: string;
    category: string;
    linkedReference: string | null;
    status: string;
    priority: string;
    requester: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        inue: string | null;
    };
    assignee: {
        id: string;
        name: string | null;
    } | null;
    createdAt: Date | null;
    lastMessageAt: Date | null;
    lastMessageBy: string;
    firstResponseAt: Date | null;
    resolvedAt: Date | null;
    closedAt: Date | null;
}>;
export declare function updateTicket(db: Db, id: string, actorId: string, patch: {
    status?: string;
    priority?: string;
    assignedTo?: string | null;
}): Promise<{
    messages: {
        id: string;
        authorType: string;
        authorName: string | null;
        content: string;
        isInternal: boolean;
        createdAt: Date | null;
    }[];
    id: string;
    reference: string;
    subject: string;
    category: string;
    linkedReference: string | null;
    status: string;
    priority: string;
    requester: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        inue: string | null;
    };
    assignee: {
        id: string;
        name: string | null;
    } | null;
    createdAt: Date | null;
    lastMessageAt: Date | null;
    lastMessageBy: string;
    firstResponseAt: Date | null;
    resolvedAt: Date | null;
    closedAt: Date | null;
}>;
//# sourceMappingURL=support.d.ts.map