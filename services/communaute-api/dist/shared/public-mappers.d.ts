export declare function toPublicSubService(sub: any): {
    id: any;
    name: any;
    code: any;
    basePrice: number | null;
    currency: any;
    slaDays: any;
    service: {
        id: any;
        name: any;
        isCultural: boolean;
    } | null;
} | null;
export declare function toPublicAdvisor(advisor: {
    name: string;
    title: string;
} | null | undefined): {
    name: string;
    title: string;
} | null;
export declare function toPublicDemande(row: any, subService: any, advisor?: {
    name: string;
    title: string;
} | null): {
    id: any;
    dossierNumber: any;
    status: any;
    priority: any;
    totalAmount: number | null;
    currency: any;
    customPayload: any;
    submittedAt: any;
    deadlineAt: any;
    completedAt: any;
    createdAt: any;
    updatedAt: any;
    subService: {
        id: any;
        name: any;
        code: any;
        basePrice: number | null;
        currency: any;
        slaDays: any;
        service: {
            id: any;
            name: any;
            isCultural: boolean;
        } | null;
    } | null;
    advisor: {
        name: string;
        title: string;
    } | null;
};
export declare function toPublicHistory(h: any): {
    id: any;
    action: any;
    fromStatus: any;
    toStatus: any;
    comment: any;
    createdAt: any;
};
export declare function toPublicComment(c: any, revealAgent?: boolean): {
    id: any;
    content: any;
    createdAt: any;
    authorType: string;
    authorName: any;
};
export declare function toPublicRequirement(r: any): {
    id: any;
    requirementId: any;
    label: any;
    type: any;
    status: any;
    providedDocumentId: any;
    reviewerNote: any;
};
export declare function toPublicDocument(d: any): {
    id: any;
    type: any;
    status: any;
    reviewNote: any;
    expiryDate: any;
    version: any;
    notes: any;
    createdAt: any;
    updatedAt: any;
    file: {
        originalName: any;
        mimeType: any;
        size: any;
        uploadedAt: any;
    } | null;
    category: {
        id: any;
        name: any;
    } | null;
};
export declare function toPublicDemandeDocument(d: any): {
    id: any;
    requirementId: any;
    type: any;
    status: any;
    reviewNote: any;
    createdAt: any;
    file: {
        originalName: any;
        mimeType: any;
        size: any;
    };
};
export declare function toPublicNotification(n: any): {
    id: any;
    type: any;
    title: any;
    message: any;
    status: any;
    actionUrl: any;
    demandeId: string | null;
    rendezVousId: string | null;
    readAt: any;
    createdAt: any;
};
export declare function toPublicRendezVous(item: any): {
    id: any;
    ticketId: any;
    status: any;
    type: any;
    date: any;
    startTime: any;
    endTime: any;
    motif: any;
    demandeId: any;
    subService: any;
    advisor: {
        name: string;
        title: string;
    } | null;
    canModify: any;
    createdAt: any;
    updatedAt: any;
};
export declare function toPublicCampagne(item: any, signPath: (fileId: string) => string): {
    id: any;
    type: any;
    title: any;
    excerpt: string;
    content: any;
    publishedAt: any;
    cover: {
        name: any;
        mimeType: any;
        size: any;
        url: string;
    } | null;
    attachments: any;
    likes: any;
    participants: any;
    likedByMe: any;
    participatingByMe: any;
};
//# sourceMappingURL=public-mappers.d.ts.map