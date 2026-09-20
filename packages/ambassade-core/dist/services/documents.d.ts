import type { Db } from "../db-type";
interface Actor {
    userId: string;
    roleName: string | null;
}
export declare function writeDocumentAudit(db: Db, params: {
    documentId: string;
    documentKind?: string;
    action: string;
    actor: Actor;
    ipAddress?: string | null;
    userAgent?: string | null;
    details?: Record<string, unknown> | null;
}): Promise<void>;
export declare function listCategories(db: Db): Promise<{
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
export declare function listDocuments(db: Db, query: {
    status?: string;
    type?: string;
    categoryId?: string;
    ownerUserId?: string;
    search?: string;
    page?: number;
    limit?: number;
}): Promise<{
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
export declare function getDocument(db: Db, id: string): Promise<{
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
export declare function getDocumentOwnerId(db: Db, id: string): Promise<string>;
export declare function uploadDocument(db: Db, fileBuffer: Buffer, originalName: string, mimeType: string, data: {
    type: string;
    ownerUserId: string;
    categoryId?: string | null;
    expiryDate?: string | null;
    notes?: string | null;
    demandeId?: string | null;
    requirementId?: string | null;
}, actor: Actor, ip?: string | null, userAgent?: string | null): Promise<{
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
export declare function downloadDocument(db: Db, id: string, actor: Actor, ip?: string | null, userAgent?: string | null): Promise<{
    buffer: Buffer<ArrayBufferLike>;
    contentType: string;
    filename: string;
}>;
export declare function deleteDocument(db: Db, id: string, actor: Actor): Promise<void>;
export {};
//# sourceMappingURL=documents.d.ts.map