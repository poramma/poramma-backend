import type { Db } from "../db-type";
interface Actor {
    userId: string;
    roleName: string | null;
}
export interface CreateDemandeInput {
    userId: string;
    subServiceId: string;
    priority?: string;
    totalAmount?: number | null;
    currency?: string | null;
    customPayload?: Record<string, unknown> | null;
    documents?: {
        requirementId?: string | null;
        documentId: string;
    }[];
    enforceRequiredDocuments?: boolean;
}
export declare function createDemande(db: Db, data: CreateDemandeInput): Promise<{
    id: string;
    createdAt: Date | null;
    currency: string | null;
    subServiceId: string;
    userId: string;
    status: string;
    submittedAt: Date | null;
    updatedAt: Date | null;
    assignedAgentId: string | null;
    dossierNumber: string;
    priority: string;
    totalAmount: string | null;
    customPayload: unknown;
    assignedAt: Date | null;
    deadlineAt: Date | null;
    completedAt: Date | null;
}>;
export declare function getDemandeRow(db: Db, id: string): Promise<{
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
}>;
export declare function listDemandesByUser(db: Db, userId: string): Promise<{
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
}[]>;
export declare function getOwnedDemande(db: Db, id: string, userId: string): Promise<{
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
}>;
export declare function listHistory(db: Db, demandeId: string): Promise<{
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
export declare function listComments(db: Db, demandeId: string): Promise<{
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
export declare function recordComplementProvided(db: Db, demandeId: string, actor: Actor, kind: "message" | "document"): Promise<void>;
export declare function addComment(db: Db, demandeId: string, content: string, isInternal: boolean, actor: Actor, isStaff: boolean): Promise<{
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
export declare function listRequirements(db: Db, demandeId: string): Promise<{
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
export declare function listDemandeDocuments(db: Db, demandeId: string): Promise<{
    linkId: string;
    requirementId: string | null;
    documentId: string;
    type: string;
    status: string;
    reviewNote: string | null;
    createdAt: Date | null;
    originalName: string;
    mimeType: string;
    size: number;
}[]>;
export {};
//# sourceMappingURL=demandes.d.ts.map