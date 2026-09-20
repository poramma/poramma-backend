import { campagnesLogic } from "@poramma/ambassade-core";
import { CampagneTargetFilters } from "../../db/schema.identity-readonly";
interface Actor {
    userId: string;
    roleName: string | null;
}
export declare function listCampagnes(query: {
    status?: string;
    type?: string;
}): Promise<{
    coverImage: {
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
    attachments: {
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
        campagneId: string;
        fileId: string;
        type: string;
        order: number;
        caption: string | null;
        isBanner: boolean;
        createdAt: Date | null;
    }[];
    sentByUser: {
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
    targetFilters: {};
    stats: {
        totalRecipients: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
        openRate: number;
        clickRate: number;
    };
    interactions: campagnesLogic.InteractionStats;
    id: string;
    createdAt: Date | null;
    type: string;
    status: string;
    content: string;
    title: string;
    coverImageId: string | null;
    channels: unknown;
    scheduledAt: Date | null;
    sentAt: Date | null;
    sentBy: string;
    statsTotalRecipients: number;
    statsSent: number;
    statsDelivered: number;
    statsOpened: number;
    statsClicked: number;
    statsFailed: number;
}[]>;
export declare function getCampagne(id: string): Promise<{
    coverImage: {
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
    attachments: {
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
        campagneId: string;
        fileId: string;
        type: string;
        order: number;
        caption: string | null;
        isBanner: boolean;
        createdAt: Date | null;
    }[];
    sentByUser: {
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
    targetFilters: {};
    stats: {
        totalRecipients: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
        openRate: number;
        clickRate: number;
    };
    interactions: campagnesLogic.InteractionStats;
    id: string;
    createdAt: Date | null;
    type: string;
    status: string;
    content: string;
    title: string;
    coverImageId: string | null;
    channels: unknown;
    scheduledAt: Date | null;
    sentAt: Date | null;
    sentBy: string;
    statsTotalRecipients: number;
    statsSent: number;
    statsDelivered: number;
    statsOpened: number;
    statsClicked: number;
    statsFailed: number;
}>;
export declare function createCampagne(data: {
    title: string;
    content: string;
    type: string;
    coverImageFileId?: string;
    targetFilters: CampagneTargetFilters;
    scheduledAt?: string;
    channels: string[];
}, actor: Actor): Promise<{
    coverImage: {
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
    attachments: {
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
        campagneId: string;
        fileId: string;
        type: string;
        order: number;
        caption: string | null;
        isBanner: boolean;
        createdAt: Date | null;
    }[];
    sentByUser: {
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
    targetFilters: {};
    stats: {
        totalRecipients: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
        openRate: number;
        clickRate: number;
    };
    interactions: campagnesLogic.InteractionStats;
    id: string;
    createdAt: Date | null;
    type: string;
    status: string;
    content: string;
    title: string;
    coverImageId: string | null;
    channels: unknown;
    scheduledAt: Date | null;
    sentAt: Date | null;
    sentBy: string;
    statsTotalRecipients: number;
    statsSent: number;
    statsDelivered: number;
    statsOpened: number;
    statsClicked: number;
    statsFailed: number;
}>;
export declare function updateCampagne(id: string, data: Partial<{
    title: string;
    content: string;
    type: string;
    coverImageFileId: string;
    targetFilters: CampagneTargetFilters;
    scheduledAt: string;
    channels: string[];
}>): Promise<{
    coverImage: {
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
    attachments: {
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
        campagneId: string;
        fileId: string;
        type: string;
        order: number;
        caption: string | null;
        isBanner: boolean;
        createdAt: Date | null;
    }[];
    sentByUser: {
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
    targetFilters: {};
    stats: {
        totalRecipients: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
        openRate: number;
        clickRate: number;
    };
    interactions: campagnesLogic.InteractionStats;
    id: string;
    createdAt: Date | null;
    type: string;
    status: string;
    content: string;
    title: string;
    coverImageId: string | null;
    channels: unknown;
    scheduledAt: Date | null;
    sentAt: Date | null;
    sentBy: string;
    statsTotalRecipients: number;
    statsSent: number;
    statsDelivered: number;
    statsOpened: number;
    statsClicked: number;
    statsFailed: number;
}>;
export declare function sendCampagne(id: string, actor: Actor): Promise<{
    coverImage: {
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
    attachments: {
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
        campagneId: string;
        fileId: string;
        type: string;
        order: number;
        caption: string | null;
        isBanner: boolean;
        createdAt: Date | null;
    }[];
    sentByUser: {
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
    targetFilters: {};
    stats: {
        totalRecipients: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
        openRate: number;
        clickRate: number;
    };
    interactions: campagnesLogic.InteractionStats;
    id: string;
    createdAt: Date | null;
    type: string;
    status: string;
    content: string;
    title: string;
    coverImageId: string | null;
    channels: unknown;
    scheduledAt: Date | null;
    sentAt: Date | null;
    sentBy: string;
    statsTotalRecipients: number;
    statsSent: number;
    statsDelivered: number;
    statsOpened: number;
    statsClicked: number;
    statsFailed: number;
}>;
export declare function scheduleCampagne(id: string, scheduledAt: string): Promise<{
    coverImage: {
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
    attachments: {
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
        campagneId: string;
        fileId: string;
        type: string;
        order: number;
        caption: string | null;
        isBanner: boolean;
        createdAt: Date | null;
    }[];
    sentByUser: {
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
    targetFilters: {};
    stats: {
        totalRecipients: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
        openRate: number;
        clickRate: number;
    };
    interactions: campagnesLogic.InteractionStats;
    id: string;
    createdAt: Date | null;
    type: string;
    status: string;
    content: string;
    title: string;
    coverImageId: string | null;
    channels: unknown;
    scheduledAt: Date | null;
    sentAt: Date | null;
    sentBy: string;
    statsTotalRecipients: number;
    statsSent: number;
    statsDelivered: number;
    statsOpened: number;
    statsClicked: number;
    statsFailed: number;
}>;
export declare function processDueScheduledCampagnes(): Promise<void>;
export declare function startCampagneScheduler(): void;
export declare function cancelCampagne(id: string): Promise<{
    coverImage: {
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
    attachments: {
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
        campagneId: string;
        fileId: string;
        type: string;
        order: number;
        caption: string | null;
        isBanner: boolean;
        createdAt: Date | null;
    }[];
    sentByUser: {
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
    targetFilters: {};
    stats: {
        totalRecipients: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
        openRate: number;
        clickRate: number;
    };
    interactions: campagnesLogic.InteractionStats;
    id: string;
    createdAt: Date | null;
    type: string;
    status: string;
    content: string;
    title: string;
    coverImageId: string | null;
    channels: unknown;
    scheduledAt: Date | null;
    sentAt: Date | null;
    sentBy: string;
    statsTotalRecipients: number;
    statsSent: number;
    statsDelivered: number;
    statsOpened: number;
    statsClicked: number;
    statsFailed: number;
}>;
export declare function duplicateCampagne(id: string, actor: Actor): Promise<{
    coverImage: {
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
    attachments: {
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
        campagneId: string;
        fileId: string;
        type: string;
        order: number;
        caption: string | null;
        isBanner: boolean;
        createdAt: Date | null;
    }[];
    sentByUser: {
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
    targetFilters: {};
    stats: {
        totalRecipients: number;
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        failed: number;
        openRate: number;
        clickRate: number;
    };
    interactions: campagnesLogic.InteractionStats;
    id: string;
    createdAt: Date | null;
    type: string;
    status: string;
    content: string;
    title: string;
    coverImageId: string | null;
    channels: unknown;
    scheduledAt: Date | null;
    sentAt: Date | null;
    sentBy: string;
    statsTotalRecipients: number;
    statsSent: number;
    statsDelivered: number;
    statsOpened: number;
    statsClicked: number;
    statsFailed: number;
}>;
export declare function listDeliveries(campagneId: string): Promise<{
    userName: string | undefined;
    id: string;
    campagneId: string;
    userId: string;
    channel: string;
    status: string;
    sentAt: Date | null;
    deliveredAt: Date | null;
    openedAt: Date | null;
    clickedAt: Date | null;
    errorMessage: string | null;
}[]>;
export declare function resendToFailed(campagneId: string): Promise<{
    recovered: number;
    remaining: number;
}>;
export declare const MAX_BANNER_ITEMS = 8;
export declare function uploadAttachment(campagneId: string, fileBuffer: Buffer, originalName: string, mimeType: string, data: {
    type: string;
    caption?: string;
    isBanner?: boolean;
}, actor: Actor): Promise<{
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
    };
    id: string;
    order: number;
    createdAt: Date | null;
    type: string;
    fileId: string;
    campagneId: string;
    caption: string | null;
    isBanner: boolean;
}>;
export declare function updateAttachment(campagneId: string, attachmentId: string, patch: {
    isBanner?: boolean;
    caption?: string | null;
}): Promise<{
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
    campagneId: string;
    fileId: string;
    type: string;
    order: number;
    caption: string | null;
    isBanner: boolean;
    createdAt: Date | null;
}>;
export declare function getCampagneFile(campagneId: string, fileId: string): Promise<{
    buffer: Buffer<ArrayBufferLike>;
    contentType: string;
    filename: string;
}>;
export declare function removeAttachment(campagneId: string, attachmentId: string): Promise<void>;
export declare function reorderAttachments(campagneId: string, orderedAttachmentIds: string[]): Promise<void>;
export declare function estimateRecipients(filters: CampagneTargetFilters): Promise<{
    estimatedCount: number;
    breakdown: {
        byCity?: Record<string, number>;
    };
}>;
export {};
//# sourceMappingURL=communication.service.d.ts.map