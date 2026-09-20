interface Actor {
    userId: string;
    roleName: string | null;
}
export declare function listEtudiants(filters: {
    search?: string;
    status?: string;
    city?: string;
    university?: string;
    faculty?: string;
    studyLevel?: string;
    hasBourse?: boolean;
    hasInue?: boolean;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}): Promise<{
    data: {
        id: string;
        userId: string;
        email: string;
        phone: string | null;
        firstName: string | null;
        lastName: string | null;
        nationality: string | null;
        city: string | null;
        country: string | null;
        registeredAt: Date | null;
        accountStatus: string | null;
        profile: {
            university: string | null;
            faculty: string | null;
            studyLevel: string | null;
        };
        bourse: {
            isRecipient: boolean;
            decisionNumber: string | null;
            promotion: string | null;
        } | null;
        status: string;
        inue: string | null;
        inueAssignedAt: Date | null;
        submittedAt: Date | null;
        reviewNote: string | null;
        reviewedBy: string | null;
        reviewedAt: Date | null;
    }[];
    meta: import("@poramma/dto").PaginationMeta;
}>;
export declare function getEtudiantDetail(userId: string): Promise<{
    id: string;
    userId: string;
    email: string;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    nationality: string | null;
    city: string | null;
    country: string | null;
    registeredAt: Date | null;
    accountStatus: string | null;
    profile: {
        university: string | null;
        faculty: string | null;
        studyLevel: string | null;
    };
    bourse: {
        isRecipient: boolean;
        decisionNumber: string | null;
        promotion: string | null;
    } | null;
    status: string;
    inue: string | null;
    inueAssignedAt: Date | null;
    submittedAt: Date | null;
    reviewNote: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
}>;
export declare function searchEtudiants(query: string): Promise<{
    id: string;
    userId: string;
    email: string;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    nationality: string | null;
    city: string | null;
    country: string | null;
    registeredAt: Date | null;
    accountStatus: string | null;
    profile: {
        university: string | null;
        faculty: string | null;
        studyLevel: string | null;
    };
    bourse: {
        isRecipient: boolean;
        decisionNumber: string | null;
        promotion: string | null;
    } | null;
    status: string;
    inue: string | null;
    inueAssignedAt: Date | null;
    submittedAt: Date | null;
    reviewNote: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
}[]>;
export declare function getEtudiantDocuments(userId: string): Promise<{
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
export declare function getEtudiantAudit(userId: string): Promise<{
    id: string;
    at: Date;
    actorUserId: string | null;
    actorEmail: string | null;
    actorInue: string | null;
    actorName: string | null;
    actorRole: string;
    action: string;
    entityType: string;
    entityId: string;
    entitySnapshot: unknown;
    result: string;
    details: unknown;
    ip: string | null;
    ua: string | null;
    sessionId: string | null;
    severity: string;
}[]>;
export declare function validateEtudiant(userId: string, comment: string | undefined, actor: Actor): Promise<{
    id: string;
    userId: string;
    email: string;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    nationality: string | null;
    city: string | null;
    country: string | null;
    registeredAt: Date | null;
    accountStatus: string | null;
    profile: {
        university: string | null;
        faculty: string | null;
        studyLevel: string | null;
    };
    bourse: {
        isRecipient: boolean;
        decisionNumber: string | null;
        promotion: string | null;
    } | null;
    status: string;
    inue: string | null;
    inueAssignedAt: Date | null;
    submittedAt: Date | null;
    reviewNote: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
}>;
export declare function rejectEtudiant(userId: string, reason: string, actor: Actor): Promise<{
    id: string;
    userId: string;
    email: string;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    nationality: string | null;
    city: string | null;
    country: string | null;
    registeredAt: Date | null;
    accountStatus: string | null;
    profile: {
        university: string | null;
        faculty: string | null;
        studyLevel: string | null;
    };
    bourse: {
        isRecipient: boolean;
        decisionNumber: string | null;
        promotion: string | null;
    } | null;
    status: string;
    inue: string | null;
    inueAssignedAt: Date | null;
    submittedAt: Date | null;
    reviewNote: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
}>;
export declare function suspendEtudiant(userId: string, reason: string, actor: Actor): Promise<{
    id: string;
    userId: string;
    email: string;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    nationality: string | null;
    city: string | null;
    country: string | null;
    registeredAt: Date | null;
    accountStatus: string | null;
    profile: {
        university: string | null;
        faculty: string | null;
        studyLevel: string | null;
    };
    bourse: {
        isRecipient: boolean;
        decisionNumber: string | null;
        promotion: string | null;
    } | null;
    status: string;
    inue: string | null;
    inueAssignedAt: Date | null;
    submittedAt: Date | null;
    reviewNote: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
}>;
export declare function assignInueToEtudiant(userId: string, actor: Actor, yearOverride?: number): Promise<{
    inueAssignment: {
        inue: string;
        year: number;
        sequence: number;
    };
    id: string;
    userId: string;
    email: string;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    nationality: string | null;
    city: string | null;
    country: string | null;
    registeredAt: Date | null;
    accountStatus: string | null;
    profile: {
        university: string | null;
        faculty: string | null;
        studyLevel: string | null;
    };
    bourse: {
        isRecipient: boolean;
        decisionNumber: string | null;
        promotion: string | null;
    } | null;
    status: string;
    inue: string | null;
    inueAssignedAt: Date | null;
    submittedAt: Date | null;
    reviewNote: string | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
}>;
export declare function estimateEtudiants(filters: {
    status?: string;
    city?: string;
    university?: string;
    faculty?: string;
    studyLevel?: string;
    hasBourse?: boolean;
}): Promise<{
    count: number;
    sample: {
        id: string;
        firstName: string | null;
        lastName: string | null;
    }[];
}>;
export {};
//# sourceMappingURL=etudiants.service.d.ts.map