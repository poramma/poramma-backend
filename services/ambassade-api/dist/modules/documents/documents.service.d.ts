import { documentCategories } from "../../db/schema.documents";
import { documentsLogic } from "@poramma/ambassade-core";
interface Actor {
    userId: string;
    roleName: string | null;
}
export declare function listCategories(): Promise<{
    id: string;
    name: string;
    code: string;
    description: string | null;
    allowedTypes: unknown;
    requiresValidation: boolean | null;
    maxVersions: number | null;
    retentionDays: number | null;
    createdAt: Date | null;
}[]>;
export declare function createCategory(data: {
    name: string;
    code: string;
    description?: string | null;
    allowedTypes: string[];
    requiresValidation?: boolean;
    maxVersions?: number;
    retentionDays?: number | null;
}): Promise<{
    id: string;
    name: string;
    code: string;
    description: string | null;
    createdAt: Date | null;
    allowedTypes: unknown;
    requiresValidation: boolean | null;
    maxVersions: number | null;
    retentionDays: number | null;
}>;
export declare function updateCategory(id: string, data: Partial<typeof documentCategories.$inferInsert>): Promise<{
    id: string;
    name: string;
    code: string;
    description: string | null;
    allowedTypes: unknown;
    requiresValidation: boolean | null;
    maxVersions: number | null;
    retentionDays: number | null;
    createdAt: Date | null;
}>;
export declare function deleteCategory(id: string): Promise<void>;
export declare function logView(documentId: string, actor: Actor, ip?: string | null, userAgent?: string | null): Promise<void>;
export declare function listAudit(documentId: string | undefined, limit: number): Promise<{
    id: string;
    documentId: string;
    documentKind: string;
    action: string;
    actorUserId: string;
    actorName: string | null;
    actorRole: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    details: unknown;
    createdAt: Date | null;
}[]>;
export declare const listDocuments: (query: Parameters<typeof documentsLogic.listDocuments>[1]) => Promise<{
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
export declare const getDocument: (id: string) => Promise<{
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
}>;
export declare const getDocumentOwnerId: (id: string) => Promise<string>;
export declare const uploadDocument: (fileBuffer: Buffer, originalName: string, mimeType: string, data: Parameters<typeof documentsLogic.uploadDocument>[4], actor: Actor, ip?: string | null, userAgent?: string | null) => Promise<{
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
}>;
export declare function addDocumentVersion(documentId: string, fileBuffer: Buffer, originalName: string, mimeType: string, changeNote: string | undefined, actor: Actor): Promise<{
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
    updatedAt: Date | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    notes: string | null;
    reviewNote: string | null;
    ownerUserId: string;
    categoryId: string | null;
    fileId: string;
    expiryDate: string | null;
    version: number;
}>;
export declare function listVersions(documentId: string): Promise<{
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
    id: string;
    documentId: string;
    fileId: string;
    version: number;
    changeNote: string | null;
    createdBy: string;
    createdAt: Date | null;
}[]>;
export declare const downloadDocument: (id: string, actor: Actor, ip?: string | null, userAgent?: string | null) => Promise<{
    buffer: Buffer<ArrayBufferLike>;
    contentType: string;
    filename: string;
}>;
export declare function validateDocument(id: string, status: "ACCEPTED" | "REJECTED", reviewNote: string | undefined, actor: Actor): Promise<{
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
    updatedAt: Date | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    notes: string | null;
    reviewNote: string | null;
    ownerUserId: string;
    categoryId: string | null;
    fileId: string;
    expiryDate: string | null;
    version: number;
}>;
export declare function archiveDocument(id: string, actor: Actor): Promise<{
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
    updatedAt: Date | null;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    notes: string | null;
    reviewNote: string | null;
    ownerUserId: string;
    categoryId: string | null;
    fileId: string;
    expiryDate: string | null;
    version: number;
}>;
export declare function getStats(): Promise<{
    totalPending: number;
    totalAccepted: number;
    totalRejected: number;
    averageReviewTimeHours: number;
    expiringSoonCount: number;
    byType: {
        type: string;
        count: number;
    }[];
    byStatus: {
        status: string;
        count: number;
    }[];
    recentActivity: {
        id: string;
        documentId: string;
        documentKind: string;
        action: string;
        actorUserId: string;
        actorName: string | null;
        actorRole: string | null;
        ipAddress: string | null;
        userAgent: string | null;
        details: unknown;
        createdAt: Date | null;
    }[];
}>;
export {};
//# sourceMappingURL=documents.service.d.ts.map