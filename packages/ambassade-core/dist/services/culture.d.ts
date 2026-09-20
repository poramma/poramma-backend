import type { Db } from "../db-type";
export declare const CULTURE_ROLE = "CULTURAL_ADVISOR";
export interface Advisor {
    userId: string;
    agentId: string;
    name: string;
    title: string;
}
export declare function listAdvisors(db: Db): Promise<Advisor[]>;
export declare function advisorByAgentId(db: Db, agentId: string | null | undefined): Promise<Advisor | null>;
export declare function culturalSubServiceIds(db: Db): Promise<string[]>;
export declare function isCulturalSubService(db: Db, subServiceId: string): Promise<boolean>;
export declare function cultureStaffIds(db: Db): Promise<string[]>;
export declare function notifyCultureStaff(db: Db, params: {
    title: string;
    body: string;
    payload?: Record<string, unknown>;
    actionUrl: string;
    exceptUserId?: string;
}): Promise<void>;
export declare function notifyAdvisorRendezVous(db: Db, params: {
    agentId: string;
    event: "BOOKED" | "RESCHEDULED" | "CANCELLED";
    userId: string;
    ticketId: string;
    date: string;
    startTime?: string;
}): Promise<void>;
export declare function createThread(db: Db, userId: string, data: {
    subject: string;
    message: string;
}): Promise<{
    id: string;
    reference: string;
    subject: string;
    status: string;
    advisor: {
        name: string | null;
        title: string;
    };
    createdAt: Date | null;
    lastMessageAt: Date | null;
    lastMessageBy: string;
    closedAt: Date | null;
}>;
export declare function listThreadsForUser(db: Db, userId: string): Promise<{
    id: string;
    reference: string;
    subject: string;
    status: string;
    advisor: {
        name: string | null;
        title: string;
    };
    createdAt: Date | null;
    lastMessageAt: Date | null;
    lastMessageBy: string;
    closedAt: Date | null;
}[]>;
export declare function getThreadForUser(db: Db, userId: string, id: string): Promise<{
    messages: {
        id: string;
        authorType: "USER" | "ADVISOR" | "SYSTEM";
        authorName: string | null;
        content: string;
        createdAt: Date | null;
    }[];
    id: string;
    reference: string;
    subject: string;
    status: string;
    advisor: {
        name: string | null;
        title: string;
    };
    createdAt: Date | null;
    lastMessageAt: Date | null;
    lastMessageBy: string;
    closedAt: Date | null;
}>;
export declare function addUserMessage(db: Db, userId: string, id: string, content: string): Promise<{
    id: string;
    authorType: "USER" | "ADVISOR" | "SYSTEM";
    authorName: string | null;
    content: string;
    createdAt: Date | null;
}>;
export interface ThreadFilters {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
}
export declare function threadStats(db: Db): Promise<{
    open: number;
    answered: number;
    closed: number;
}>;
export declare function listThreads(db: Db, filters: ThreadFilters): Promise<{
    data: {
        id: string;
        reference: string;
        subject: string;
        status: string;
        requester: {
            id: string;
            name: string | null;
            email: string | null;
            phone: string | null;
            inue: string | null;
        };
        advisor: {
            id: string;
            name: string | null;
        } | null;
        createdAt: Date | null;
        lastMessageAt: Date | null;
        lastMessageBy: string;
        closedAt: Date | null;
    }[];
    total: number;
    page: number;
    limit: number;
    stats: {
        open: number;
        answered: number;
        closed: number;
    };
}>;
export declare function getThreadForStaff(db: Db, id: string): Promise<{
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
    status: string;
    requester: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        inue: string | null;
    };
    advisor: {
        id: string;
        name: string | null;
    } | null;
    createdAt: Date | null;
    lastMessageAt: Date | null;
    lastMessageBy: string;
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
    status: string;
    requester: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        inue: string | null;
    };
    advisor: {
        id: string;
        name: string | null;
    } | null;
    createdAt: Date | null;
    lastMessageAt: Date | null;
    lastMessageBy: string;
    closedAt: Date | null;
}>;
export declare function setThreadStatus(db: Db, id: string, actorId: string, status: "OPEN" | "CLOSED"): Promise<{
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
    status: string;
    requester: {
        id: string;
        name: string | null;
        email: string | null;
        phone: string | null;
        inue: string | null;
    };
    advisor: {
        id: string;
        name: string | null;
    } | null;
    createdAt: Date | null;
    lastMessageAt: Date | null;
    lastMessageBy: string;
    closedAt: Date | null;
}>;
export declare function requesterSummary(db: Db, userId: string): Promise<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    inue: string | null;
} | null>;
//# sourceMappingURL=culture.d.ts.map