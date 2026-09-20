interface Actor {
    userId: string;
    roleId: string | null;
    roleName: string | null;
}
export declare function listInternalDocuments(actor: Actor, query: {
    department?: string;
    confidentiality?: string;
    search?: string;
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
    createdByUser: {
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
    updatedAt: Date | null;
    createdBy: string;
    department: string;
    fileId: string;
    version: number;
    title: string;
    confidentiality: string;
    targetRoleIds: unknown;
    targetAgentIds: unknown;
    tags: unknown;
    archivedAt: Date | null;
}[]>;
export declare function getInternalDocument(id: string, actor: Actor): Promise<{
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
    createdByUser: {
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
    updatedAt: Date | null;
    createdBy: string;
    department: string;
    fileId: string;
    version: number;
    title: string;
    confidentiality: string;
    targetRoleIds: unknown;
    targetAgentIds: unknown;
    tags: unknown;
    archivedAt: Date | null;
}>;
export declare function createInternalDocument(fileBuffer: Buffer, originalName: string, mimeType: string, data: {
    title: string;
    department: string;
    confidentiality: string;
    tags: string[];
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
    createdByUser: {
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
    updatedAt: Date | null;
    createdBy: string;
    department: string;
    fileId: string;
    version: number;
    title: string;
    confidentiality: string;
    targetRoleIds: unknown;
    targetAgentIds: unknown;
    tags: unknown;
    archivedAt: Date | null;
}>;
export declare function shareInternalDocument(id: string, data: {
    targetAgentIds: string[];
    targetRoleIds: string[];
}, actor: Actor): Promise<{
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
    createdByUser: {
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
    updatedAt: Date | null;
    createdBy: string;
    department: string;
    fileId: string;
    version: number;
    title: string;
    confidentiality: string;
    targetRoleIds: unknown;
    targetAgentIds: unknown;
    tags: unknown;
    archivedAt: Date | null;
}>;
export declare function downloadInternalDocument(id: string, actor: Actor, ip?: string | null, userAgent?: string | null): Promise<{
    buffer: Buffer<ArrayBufferLike>;
    contentType: string;
    filename: string;
}>;
export {};
//# sourceMappingURL=internal-documents.service.d.ts.map