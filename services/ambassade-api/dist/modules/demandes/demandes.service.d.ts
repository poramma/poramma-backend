import { demandesLogic } from "@poramma/ambassade-core";
interface Actor {
    userId: string;
    roleName: string | null;
}
export declare function listDemandes(query: {
    status?: string;
    priority?: string;
    subServiceId?: string;
    subServiceIds?: string[];
    assignedAgentId?: string;
    dossierNumber?: string;
    search?: string;
    isOverdue?: boolean;
    page?: number;
    limit?: number;
}): Promise<{
    totalAmount: number | null;
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
    assignedAgent: {
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
    complement: {
        requestedAt: Date;
        requestMessage: string | null;
        requestedBy: string | null;
        responded: boolean;
        respondedAt: Date | null;
        newMessages: number;
        newDocuments: number;
    } | null;
    id: string;
    createdAt: Date | null;
    subServiceId: string;
    status: string;
    currency: string | null;
    userId: string;
    assignedAgentId: string | null;
    dossierNumber: string;
    priority: string;
    customPayload: unknown;
    submittedAt: Date | null;
    assignedAt: Date | null;
    deadlineAt: Date | null;
    completedAt: Date | null;
    updatedAt: Date | null;
}[]>;
export declare function getDemande(id: string): Promise<{
    totalAmount: number | null;
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
    assignedAgent: {
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
    complement: {
        requestedAt: Date;
        requestMessage: string | null;
        requestedBy: string | null;
        responded: boolean;
        respondedAt: Date | null;
        newMessages: number;
        newDocuments: number;
    } | null;
    id: string;
    createdAt: Date | null;
    subServiceId: string;
    status: string;
    currency: string | null;
    userId: string;
    assignedAgentId: string | null;
    dossierNumber: string;
    priority: string;
    customPayload: unknown;
    submittedAt: Date | null;
    assignedAt: Date | null;
    deadlineAt: Date | null;
    completedAt: Date | null;
    updatedAt: Date | null;
}>;
export declare function createDemande(data: Parameters<typeof demandesLogic.createDemande>[1]): Promise<{
    totalAmount: number | null;
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
    assignedAgent: {
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
    complement: {
        requestedAt: Date;
        requestMessage: string | null;
        requestedBy: string | null;
        responded: boolean;
        respondedAt: Date | null;
        newMessages: number;
        newDocuments: number;
    } | null;
    id: string;
    createdAt: Date | null;
    subServiceId: string;
    status: string;
    currency: string | null;
    userId: string;
    assignedAgentId: string | null;
    dossierNumber: string;
    priority: string;
    customPayload: unknown;
    submittedAt: Date | null;
    assignedAt: Date | null;
    deadlineAt: Date | null;
    completedAt: Date | null;
    updatedAt: Date | null;
}>;
export declare function updateStatus(id: string, payload: {
    status: string;
    comment: string;
    isVisibleToUser: boolean;
    assignedAgentId?: string;
}, actor: Actor): Promise<{
    totalAmount: number | null;
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
    assignedAgent: {
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
    complement: {
        requestedAt: Date;
        requestMessage: string | null;
        requestedBy: string | null;
        responded: boolean;
        respondedAt: Date | null;
        newMessages: number;
        newDocuments: number;
    } | null;
    id: string;
    createdAt: Date | null;
    subServiceId: string;
    status: string;
    currency: string | null;
    userId: string;
    assignedAgentId: string | null;
    dossierNumber: string;
    priority: string;
    customPayload: unknown;
    submittedAt: Date | null;
    assignedAt: Date | null;
    deadlineAt: Date | null;
    completedAt: Date | null;
    updatedAt: Date | null;
}>;
export declare function assignAgent(id: string, payload: {
    agentId: string;
    note?: string;
}, actor: Actor): Promise<{
    totalAmount: number | null;
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
    assignedAgent: {
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
    complement: {
        requestedAt: Date;
        requestMessage: string | null;
        requestedBy: string | null;
        responded: boolean;
        respondedAt: Date | null;
        newMessages: number;
        newDocuments: number;
    } | null;
    id: string;
    createdAt: Date | null;
    subServiceId: string;
    status: string;
    currency: string | null;
    userId: string;
    assignedAgentId: string | null;
    dossierNumber: string;
    priority: string;
    customPayload: unknown;
    submittedAt: Date | null;
    assignedAt: Date | null;
    deadlineAt: Date | null;
    completedAt: Date | null;
    updatedAt: Date | null;
}>;
export declare function listHistory(demandeId: string): Promise<{
    id: string;
    demandeId: string;
    action: string;
    fromStatus: string | null;
    toStatus: string;
    actorUserId: string;
    actorRole: string | null;
    actorName: string | null;
    comment: string | null;
    isVisibleToUser: boolean | null;
    createdAt: Date | null;
}[]>;
export declare function listComments(demandeId: string): Promise<{
    id: string;
    demandeId: string;
    authorId: string;
    authorName: string | null;
    authorType: string;
    content: string;
    isInternal: boolean | null;
    attachments: unknown;
    createdAt: Date | null;
    updatedAt: Date | null;
}[]>;
export declare function getDemandeOwnerId(demandeId: string): Promise<string>;
export declare function getDemandeAccessInfo(demandeId: string): Promise<{
    userId: string;
    subServiceId: string;
}>;
export declare function addComment(demandeId: string, content: string, isInternal: boolean, actor: Actor, isStaff: boolean): Promise<{
    id: string;
    createdAt: Date | null;
    updatedAt: Date | null;
    demandeId: string;
    authorId: string;
    authorName: string | null;
    authorType: string;
    content: string;
    isInternal: boolean | null;
    attachments: unknown;
}>;
export declare function listDemandeDocuments(demandeId: string): Promise<{
    demandeRequirementId: string | null;
    previousVersionId: null;
    file: {
        encryptionKeyId: null;
        id: string;
        path: string;
        mimeType: string;
        originalName: string;
        checksum: string;
        size: number;
        uploadedBy: string;
        uploadedAt: Date | null;
        expiresAt: Date | null;
    } | null;
    owner: {
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
    category: {
        id: string;
        name: string;
        code: string;
        description: string | null;
        allowedTypes: unknown;
        requiresValidation: boolean | null;
        maxVersions: number | null;
        retentionDays: number | null;
        createdAt: Date | null;
    } | null;
    reviewedByUser: {
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
    createdAt: Date | null;
    type: string;
    status: string;
    reviewNote: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    updatedAt: Date | null;
    ownerUserId: string;
    categoryId: string | null;
    fileId: string;
    expiryDate: string | null;
    version: number;
    notes: string | null;
}[]>;
export declare function listRequirements(demandeId: string): Promise<{
    id: string;
    demandeId: string;
    requirementId: string;
    label: string;
    type: string;
    status: string;
    providedValue: string | null;
    providedDocumentId: string | null;
    reviewerNote: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
}[]>;
export declare function validateRequirement(requirementId: string, status: string, note: string | undefined, actor: Actor): Promise<{
    id: string;
    demandeId: string;
    requirementId: string;
    label: string;
    type: string;
    status: string;
    providedValue: string | null;
    providedDocumentId: string | null;
    reviewerNote: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
}>;
export {};
//# sourceMappingURL=demandes.service.d.ts.map