interface Actor {
    userId: string;
    roleName: string | null;
}
export interface AgendaSlotDto {
    id: string;
    subServiceId: string;
    subService: unknown;
    agentId: string;
    agent: unknown;
    date: string;
    startTime: string;
    endTime: string;
    tz: string;
    isBooked: boolean;
    isBlocked: boolean;
    blockReason: string | null;
    createdAt: string;
}
export declare function listAgendaSlots(query: {
    date: string;
    subServiceId?: string;
    agentId?: string;
}): Promise<AgendaSlotDto[]>;
export declare function getAgendaSlot(id: string): Promise<AgendaSlotDto>;
export declare function listRendezVous(query: {
    date?: string;
    agentId?: string;
    subServiceId?: string;
    subServiceIds?: string[];
    status?: string;
    type?: string;
    userId?: string;
    fromDate?: string;
    toDate?: string;
}): Promise<{
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
    } | {
        id: null;
        email: null;
        phone: string;
        status: null;
        createdAt: null;
        isVisitor: boolean;
        profile: {
            firstName: string;
            lastName: string;
            city: string;
            inue: null;
        };
    } | null;
    subService: {
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
    } | null;
    agent: {
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
    } | null;
    demande: {
        id: string;
        userId: string;
        subServiceId: string;
        assignedAgentId: string | null;
        dossierNumber: string;
        status: string;
        priority: string;
        totalAmount: string | null;
        currency: string | null;
        customPayload: unknown;
        submittedAt: Date | null;
        assignedAt: Date | null;
        deadlineAt: Date | null;
        completedAt: Date | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    } | null;
    slot: AgendaSlotDto | null;
    id: string;
    createdAt: Date | null;
    date: string;
    subServiceId: string;
    type: string;
    status: string;
    userId: string | null;
    completedAt: Date | null;
    updatedAt: Date | null;
    demandeId: string | null;
    createdBy: string;
    agentId: string;
    visitor: {
        lastName: string;
        firstName: string;
        phone: string;
        city: string;
    } | null;
    slotId: string | null;
    ticketId: string;
    motif: string | null;
    isUrgent: boolean | null;
    urgenceJustification: string | null;
    remindedAt: Date | null;
    checkedInAt: Date | null;
}[]>;
export declare function getRendezVous(id: string): Promise<{
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
    } | {
        id: null;
        email: null;
        phone: string;
        status: null;
        createdAt: null;
        isVisitor: boolean;
        profile: {
            firstName: string;
            lastName: string;
            city: string;
            inue: null;
        };
    } | null;
    subService: {
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
    } | null;
    agent: {
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
    } | null;
    demande: {
        id: string;
        userId: string;
        subServiceId: string;
        assignedAgentId: string | null;
        dossierNumber: string;
        status: string;
        priority: string;
        totalAmount: string | null;
        currency: string | null;
        customPayload: unknown;
        submittedAt: Date | null;
        assignedAt: Date | null;
        deadlineAt: Date | null;
        completedAt: Date | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    } | null;
    slot: AgendaSlotDto | null;
    id: string;
    createdAt: Date | null;
    date: string;
    subServiceId: string;
    type: string;
    status: string;
    userId: string | null;
    completedAt: Date | null;
    updatedAt: Date | null;
    demandeId: string | null;
    createdBy: string;
    agentId: string;
    visitor: {
        lastName: string;
        firstName: string;
        phone: string;
        city: string;
    } | null;
    slotId: string | null;
    ticketId: string;
    motif: string | null;
    isUrgent: boolean | null;
    urgenceJustification: string | null;
    remindedAt: Date | null;
    checkedInAt: Date | null;
}>;
export declare function createRendezVous(data: {
    userId: string;
    subServiceId: string;
    agentId?: string;
    slotId: string;
    motif?: string | null;
    demandeId?: string | null;
}, actor: Actor): Promise<{
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
    } | {
        id: null;
        email: null;
        phone: string;
        status: null;
        createdAt: null;
        isVisitor: boolean;
        profile: {
            firstName: string;
            lastName: string;
            city: string;
            inue: null;
        };
    } | null;
    subService: {
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
    } | null;
    agent: {
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
    } | null;
    demande: {
        id: string;
        userId: string;
        subServiceId: string;
        assignedAgentId: string | null;
        dossierNumber: string;
        status: string;
        priority: string;
        totalAmount: string | null;
        currency: string | null;
        customPayload: unknown;
        submittedAt: Date | null;
        assignedAt: Date | null;
        deadlineAt: Date | null;
        completedAt: Date | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    } | null;
    slot: AgendaSlotDto | null;
    id: string;
    createdAt: Date | null;
    date: string;
    subServiceId: string;
    type: string;
    status: string;
    userId: string | null;
    completedAt: Date | null;
    updatedAt: Date | null;
    demandeId: string | null;
    createdBy: string;
    agentId: string;
    visitor: {
        lastName: string;
        firstName: string;
        phone: string;
        city: string;
    } | null;
    slotId: string | null;
    ticketId: string;
    motif: string | null;
    isUrgent: boolean | null;
    urgenceJustification: string | null;
    remindedAt: Date | null;
    checkedInAt: Date | null;
}>;
export declare function createUrgence(data: {
    userId: string;
    subServiceId: string;
    agentId: string;
    motif: string;
    urgenceJustification: string;
    demandeId?: string | null;
}, actor: Actor): Promise<{
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
    } | {
        id: null;
        email: null;
        phone: string;
        status: null;
        createdAt: null;
        isVisitor: boolean;
        profile: {
            firstName: string;
            lastName: string;
            city: string;
            inue: null;
        };
    } | null;
    subService: {
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
    } | null;
    agent: {
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
    } | null;
    demande: {
        id: string;
        userId: string;
        subServiceId: string;
        assignedAgentId: string | null;
        dossierNumber: string;
        status: string;
        priority: string;
        totalAmount: string | null;
        currency: string | null;
        customPayload: unknown;
        submittedAt: Date | null;
        assignedAt: Date | null;
        deadlineAt: Date | null;
        completedAt: Date | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    } | null;
    slot: AgendaSlotDto | null;
    id: string;
    createdAt: Date | null;
    date: string;
    subServiceId: string;
    type: string;
    status: string;
    userId: string | null;
    completedAt: Date | null;
    updatedAt: Date | null;
    demandeId: string | null;
    createdBy: string;
    agentId: string;
    visitor: {
        lastName: string;
        firstName: string;
        phone: string;
        city: string;
    } | null;
    slotId: string | null;
    ticketId: string;
    motif: string | null;
    isUrgent: boolean | null;
    urgenceJustification: string | null;
    remindedAt: Date | null;
    checkedInAt: Date | null;
}>;
export declare function updateStatus(id: string, status: string, actor: Actor): Promise<{
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
    } | {
        id: null;
        email: null;
        phone: string;
        status: null;
        createdAt: null;
        isVisitor: boolean;
        profile: {
            firstName: string;
            lastName: string;
            city: string;
            inue: null;
        };
    } | null;
    subService: {
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
    } | null;
    agent: {
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
    } | null;
    demande: {
        id: string;
        userId: string;
        subServiceId: string;
        assignedAgentId: string | null;
        dossierNumber: string;
        status: string;
        priority: string;
        totalAmount: string | null;
        currency: string | null;
        customPayload: unknown;
        submittedAt: Date | null;
        assignedAt: Date | null;
        deadlineAt: Date | null;
        completedAt: Date | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    } | null;
    slot: AgendaSlotDto | null;
    id: string;
    createdAt: Date | null;
    date: string;
    subServiceId: string;
    type: string;
    status: string;
    userId: string | null;
    completedAt: Date | null;
    updatedAt: Date | null;
    demandeId: string | null;
    createdBy: string;
    agentId: string;
    visitor: {
        lastName: string;
        firstName: string;
        phone: string;
        city: string;
    } | null;
    slotId: string | null;
    ticketId: string;
    motif: string | null;
    isUrgent: boolean | null;
    urgenceJustification: string | null;
    remindedAt: Date | null;
    checkedInAt: Date | null;
}>;
export declare function checkIn(id: string): Promise<{
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
    } | {
        id: null;
        email: null;
        phone: string;
        status: null;
        createdAt: null;
        isVisitor: boolean;
        profile: {
            firstName: string;
            lastName: string;
            city: string;
            inue: null;
        };
    } | null;
    subService: {
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
    } | null;
    agent: {
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
    } | null;
    demande: {
        id: string;
        userId: string;
        subServiceId: string;
        assignedAgentId: string | null;
        dossierNumber: string;
        status: string;
        priority: string;
        totalAmount: string | null;
        currency: string | null;
        customPayload: unknown;
        submittedAt: Date | null;
        assignedAt: Date | null;
        deadlineAt: Date | null;
        completedAt: Date | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    } | null;
    slot: AgendaSlotDto | null;
    id: string;
    createdAt: Date | null;
    date: string;
    subServiceId: string;
    type: string;
    status: string;
    userId: string | null;
    completedAt: Date | null;
    updatedAt: Date | null;
    demandeId: string | null;
    createdBy: string;
    agentId: string;
    visitor: {
        lastName: string;
        firstName: string;
        phone: string;
        city: string;
    } | null;
    slotId: string | null;
    ticketId: string;
    motif: string | null;
    isUrgent: boolean | null;
    urgenceJustification: string | null;
    remindedAt: Date | null;
    checkedInAt: Date | null;
}>;
export declare function completeRendezVous(id: string): Promise<{
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
    } | {
        id: null;
        email: null;
        phone: string;
        status: null;
        createdAt: null;
        isVisitor: boolean;
        profile: {
            firstName: string;
            lastName: string;
            city: string;
            inue: null;
        };
    } | null;
    subService: {
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
    } | null;
    agent: {
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
    } | null;
    demande: {
        id: string;
        userId: string;
        subServiceId: string;
        assignedAgentId: string | null;
        dossierNumber: string;
        status: string;
        priority: string;
        totalAmount: string | null;
        currency: string | null;
        customPayload: unknown;
        submittedAt: Date | null;
        assignedAt: Date | null;
        deadlineAt: Date | null;
        completedAt: Date | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    } | null;
    slot: AgendaSlotDto | null;
    id: string;
    createdAt: Date | null;
    date: string;
    subServiceId: string;
    type: string;
    status: string;
    userId: string | null;
    completedAt: Date | null;
    updatedAt: Date | null;
    demandeId: string | null;
    createdBy: string;
    agentId: string;
    visitor: {
        lastName: string;
        firstName: string;
        phone: string;
        city: string;
    } | null;
    slotId: string | null;
    ticketId: string;
    motif: string | null;
    isUrgent: boolean | null;
    urgenceJustification: string | null;
    remindedAt: Date | null;
    checkedInAt: Date | null;
}>;
export declare function cancelRendezVous(id: string, cancelledBy?: "USER" | "AGENT"): Promise<{
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
    } | {
        id: null;
        email: null;
        phone: string;
        status: null;
        createdAt: null;
        isVisitor: boolean;
        profile: {
            firstName: string;
            lastName: string;
            city: string;
            inue: null;
        };
    } | null;
    subService: {
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
    } | null;
    agent: {
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
    } | null;
    demande: {
        id: string;
        userId: string;
        subServiceId: string;
        assignedAgentId: string | null;
        dossierNumber: string;
        status: string;
        priority: string;
        totalAmount: string | null;
        currency: string | null;
        customPayload: unknown;
        submittedAt: Date | null;
        assignedAt: Date | null;
        deadlineAt: Date | null;
        completedAt: Date | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    } | null;
    slot: AgendaSlotDto | null;
    id: string;
    createdAt: Date | null;
    date: string;
    subServiceId: string;
    type: string;
    status: string;
    userId: string | null;
    completedAt: Date | null;
    updatedAt: Date | null;
    demandeId: string | null;
    createdBy: string;
    agentId: string;
    visitor: {
        lastName: string;
        firstName: string;
        phone: string;
        city: string;
    } | null;
    slotId: string | null;
    ticketId: string;
    motif: string | null;
    isUrgent: boolean | null;
    urgenceJustification: string | null;
    remindedAt: Date | null;
    checkedInAt: Date | null;
}>;
export declare function printDaily(params: {
    date: string;
    agentId?: string | null;
    subServiceId?: string | null;
    format: string;
}, actor: Actor): Promise<{
    agent: {
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
    } | null;
    subService: {
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
    } | null;
    printedByAgent: {
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
    } | null;
    id: string;
    date: string;
    subServiceId: string | null;
    status: string;
    content: unknown;
    agentId: string | null;
    printedBy: string;
    printedAt: Date | null;
    format: string;
}>;
export declare function printHistory(date: string): Promise<{
    agent: {
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
    } | null;
    subService: {
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
    } | null;
    printedByAgent: {
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
    } | null;
    id: string;
    date: string;
    subServiceId: string | null;
    status: string;
    content: unknown;
    agentId: string | null;
    printedBy: string;
    printedAt: Date | null;
    format: string;
}[]>;
export declare function reprint(printId: string, actor: Actor): Promise<{
    agent: {
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
    } | null;
    subService: {
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
    } | null;
    printedByAgent: {
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
    } | null;
    id: string;
    date: string;
    subServiceId: string | null;
    status: string;
    content: unknown;
    agentId: string | null;
    printedBy: string;
    printedAt: Date | null;
    format: string;
}>;
export declare function getRendezVousOwnerId(rendezVousId: string): Promise<string | null>;
export declare function getRendezVousAccessInfo(rendezVousId: string): Promise<{
    userId: string | null;
    subServiceId: string;
}>;
export declare function listNotes(rendezVousId: string): Promise<{
    id: string;
    rendezVousId: string;
    authorId: string;
    authorName: string | null;
    authorType: string;
    content: string;
    isInternal: boolean | null;
    createdAt: Date | null;
}[]>;
export declare function addNote(rendezVousId: string, content: string, isInternal: boolean, actor: Actor, isStaff: boolean): Promise<{
    id: string;
    createdAt: Date | null;
    authorId: string;
    authorName: string | null;
    authorType: string;
    content: string;
    isInternal: boolean | null;
    rendezVousId: string;
}>;
export {};
//# sourceMappingURL=rendezvous.service.d.ts.map