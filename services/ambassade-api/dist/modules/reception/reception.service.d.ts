interface Actor {
    userId: string;
    roleName: string | null;
}
export interface CreateUrgenceInput {
    subServiceId: string;
    motif: string;
    urgenceJustification: string;
    userId?: string | null;
    visitor?: {
        lastName: string;
        firstName: string;
        phone: string;
        city: string;
    } | null;
}
export declare function createUrgence(data: CreateUrgenceInput, actor: Actor): Promise<{
    id: string;
    ticketId: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    status: string;
    type: string;
    isUrgent: boolean | null;
    motif: string | null;
    checkedInAt: Date | null;
    subServiceName: string;
    citizen: {
        id: string | null;
        name: string;
        inue: string | null;
        phone: string | null;
        city: string | null;
        isVisitor: boolean;
    };
    agentName: string | null;
}>;
export declare function listAppointments(params: {
    date?: string;
    q?: string;
}): Promise<{
    id: string;
    ticketId: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    status: string;
    type: string;
    isUrgent: boolean | null;
    motif: string | null;
    checkedInAt: Date | null;
    subServiceName: string;
    citizen: {
        id: string | null;
        name: string;
        inue: string | null;
        phone: string | null;
        city: string | null;
        isVisitor: boolean;
    };
    agentName: string | null;
}[]>;
export declare function lookupTicket(ticket: string): Promise<{
    id: string;
    ticketId: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    status: string;
    type: string;
    isUrgent: boolean | null;
    motif: string | null;
    checkedInAt: Date | null;
    subServiceName: string;
    citizen: {
        id: string | null;
        name: string;
        inue: string | null;
        phone: string | null;
        city: string | null;
        isVisitor: boolean;
    };
    agentName: string | null;
}>;
export declare function validateArrival(id: string, actor: Actor): Promise<{
    id: string;
    ticketId: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    status: string;
    type: string;
    isUrgent: boolean | null;
    motif: string | null;
    checkedInAt: Date | null;
    subServiceName: string;
    citizen: {
        id: string | null;
        name: string;
        inue: string | null;
        phone: string | null;
        city: string | null;
        isVisitor: boolean;
    };
    agentName: string | null;
}>;
export declare const WALKIN_CATEGORIES: readonly ["INFORMATION", "DEPOT", "RETRAIT", "SUIVI", "AUTRE"];
export declare const WALKIN_STATUSES: readonly ["WAITING", "IN_SERVICE", "DONE", "REDIRECTED", "ABANDONED"];
export declare function listWalkIns(params: {
    date?: string;
    status?: string;
    q?: string;
}): Promise<{
    id: string;
    reference: string;
    visitorName: string;
    visitorPhone: string | null;
    member: {
        id: string;
        name: string;
        inue: string | null;
    } | null;
    subService: {
        id: string;
        name: string;
    } | null;
    category: string;
    subject: string;
    notes: string | null;
    status: string;
    priority: string;
    outcome: string | null;
    redirectedTo: {
        id: string;
        name: string;
    } | null;
    demande: {
        id: string;
        dossierNumber: string | null;
    } | null;
    registeredByName: string;
    createdAt: Date | null;
    startedAt: Date | null;
    closedAt: Date | null;
}[]>;
export interface CreateWalkInInput {
    visitorName?: string;
    visitorPhone?: string | null;
    userId?: string | null;
    subServiceId?: string | null;
    category: (typeof WALKIN_CATEGORIES)[number];
    subject: string;
    notes?: string | null;
    priority?: "NORMAL" | "URGENT";
}
export declare function createWalkIn(data: CreateWalkInInput, actor: Actor): Promise<{
    id: string;
    reference: string;
    visitorName: string;
    visitorPhone: string | null;
    member: {
        id: string;
        name: string;
        inue: string | null;
    } | null;
    subService: {
        id: string;
        name: string;
    } | null;
    category: string;
    subject: string;
    notes: string | null;
    status: string;
    priority: string;
    outcome: string | null;
    redirectedTo: {
        id: string;
        name: string;
    } | null;
    demande: {
        id: string;
        dossierNumber: string | null;
    } | null;
    registeredByName: string;
    createdAt: Date | null;
    startedAt: Date | null;
    closedAt: Date | null;
}>;
export interface UpdateWalkInInput {
    status?: (typeof WALKIN_STATUSES)[number];
    priority?: "NORMAL" | "URGENT";
    notes?: string | null;
    outcome?: string | null;
    subServiceId?: string | null;
    redirectedSubServiceId?: string | null;
}
export declare function updateWalkIn(id: string, patch: UpdateWalkInInput, actor: Actor): Promise<{
    id: string;
    reference: string;
    visitorName: string;
    visitorPhone: string | null;
    member: {
        id: string;
        name: string;
        inue: string | null;
    } | null;
    subService: {
        id: string;
        name: string;
    } | null;
    category: string;
    subject: string;
    notes: string | null;
    status: string;
    priority: string;
    outcome: string | null;
    redirectedTo: {
        id: string;
        name: string;
    } | null;
    demande: {
        id: string;
        dossierNumber: string | null;
    } | null;
    registeredByName: string;
    createdAt: Date | null;
    startedAt: Date | null;
    closedAt: Date | null;
}>;
export declare function createDossierFromWalkIn(id: string, actor: Actor): Promise<{
    id: string;
    reference: string;
    visitorName: string;
    visitorPhone: string | null;
    member: {
        id: string;
        name: string;
        inue: string | null;
    } | null;
    subService: {
        id: string;
        name: string;
    } | null;
    category: string;
    subject: string;
    notes: string | null;
    status: string;
    priority: string;
    outcome: string | null;
    redirectedTo: {
        id: string;
        name: string;
    } | null;
    demande: {
        id: string;
        dossierNumber: string | null;
    } | null;
    registeredByName: string;
    createdAt: Date | null;
    startedAt: Date | null;
    closedAt: Date | null;
}>;
export declare function summary(): Promise<{
    date: string;
    rendezVous: {
        expected: number;
        arrived: number;
        total: number;
    };
    walkIns: {
        waiting: number;
        inService: number;
        closed: number;
        total: number;
    };
}>;
export declare function searchMembers(query: string): Promise<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    inue: string | null;
}[]>;
export {};
//# sourceMappingURL=reception.service.d.ts.map