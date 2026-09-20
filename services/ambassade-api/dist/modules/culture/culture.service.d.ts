export declare function scopeFor(userId: string, roleName: string | null): Promise<string[]>;
export declare function overview(userId: string, roleName: string | null): Promise<{
    advisors: {
        name: string;
        title: string;
    }[];
    stats: {
        threadsToHandle: number;
        threadsAnswered: number;
        rendezVousToday: number;
        rendezVousUpcoming: number;
        demandesOpen: number;
    };
    upcomingRendezVous: {
        id: string;
        ticketId: string;
        date: string;
        startTime: string | null;
        status: string;
        motif: string | null;
        subServiceName: string;
        requester: {
            id: null;
            name: string;
            phone: null;
            email: null;
            inue: null;
        } | {
            id: string;
            name: string;
            phone: string | null;
            email: string | null;
            inue: string | null;
        };
    }[];
    openDemandes: {
        id: string;
        dossierNumber: string;
        status: string;
        submittedAt: Date | null;
        deadlineAt: Date | null;
        subServiceName: string;
        requester: {
            id: null;
            name: string;
            phone: null;
            email: null;
            inue: null;
        } | {
            id: string;
            name: string;
            phone: string | null;
            email: string | null;
            inue: string | null;
        };
        payload: unknown;
    }[];
}>;
//# sourceMappingURL=culture.service.d.ts.map