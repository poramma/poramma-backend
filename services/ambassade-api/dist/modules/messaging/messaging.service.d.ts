interface Actor {
    userId: string;
    roleName: string | null;
}
export declare function assertParticipant(threadId: string, userId: string): Promise<void>;
export declare function listThreads(userId: string, demandeId?: string): Promise<{
    participants: {
        id: string;
        threadId: string;
        userId: string;
        userName: string;
        role: string;
        joinedAt: Date | null;
    }[];
    lastMessage: {
        id: string;
        threadId: string;
        senderId: string;
        senderName: string;
        senderRole: "AGENT";
        body: string;
        attachments: {
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
        }[];
        status: "SENT";
        readAt: null;
        createdAt: Date | null;
    } | null;
    unreadCount: number;
    id: string;
    createdAt: Date | null;
    type: string;
    status: string;
    demandeId: string | null;
    createdBy: string;
    subject: string;
    closedAt: Date | null;
}[]>;
export declare function getThread(id: string, callerId: string): Promise<{
    participants: {
        id: string;
        threadId: string;
        userId: string;
        userName: string;
        role: string;
        joinedAt: Date | null;
    }[];
    lastMessage: {
        id: string;
        threadId: string;
        senderId: string;
        senderName: string;
        senderRole: "AGENT";
        body: string;
        attachments: {
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
        }[];
        status: "SENT";
        readAt: null;
        createdAt: Date | null;
    } | null;
    unreadCount: number;
    id: string;
    createdAt: Date | null;
    type: string;
    status: string;
    demandeId: string | null;
    createdBy: string;
    subject: string;
    closedAt: Date | null;
}>;
export declare function createThread(data: {
    demandeId?: string;
    subject: string;
    participantIds: string[];
}, actor: Actor): Promise<{
    participants: {
        id: string;
        threadId: string;
        userId: string;
        userName: string;
        role: string;
        joinedAt: Date | null;
    }[];
    lastMessage: {
        id: string;
        threadId: string;
        senderId: string;
        senderName: string;
        senderRole: "AGENT";
        body: string;
        attachments: {
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
        }[];
        status: "SENT";
        readAt: null;
        createdAt: Date | null;
    } | null;
    unreadCount: number;
    id: string;
    createdAt: Date | null;
    type: string;
    status: string;
    demandeId: string | null;
    createdBy: string;
    subject: string;
    closedAt: Date | null;
}>;
export declare function addParticipant(threadId: string, userId: string): Promise<{
    participants: {
        id: string;
        threadId: string;
        userId: string;
        userName: string;
        role: string;
        joinedAt: Date | null;
    }[];
    lastMessage: {
        id: string;
        threadId: string;
        senderId: string;
        senderName: string;
        senderRole: "AGENT";
        body: string;
        attachments: {
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
        }[];
        status: "SENT";
        readAt: null;
        createdAt: Date | null;
    } | null;
    unreadCount: number;
    id: string;
    createdAt: Date | null;
    type: string;
    status: string;
    demandeId: string | null;
    createdBy: string;
    subject: string;
    closedAt: Date | null;
}>;
export declare function updateThreadStatus(threadId: string, status: string): Promise<{
    participants: {
        id: string;
        threadId: string;
        userId: string;
        userName: string;
        role: string;
        joinedAt: Date | null;
    }[];
    lastMessage: {
        id: string;
        threadId: string;
        senderId: string;
        senderName: string;
        senderRole: "AGENT";
        body: string;
        attachments: {
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
        }[];
        status: "SENT";
        readAt: null;
        createdAt: Date | null;
    } | null;
    unreadCount: number;
    id: string;
    createdAt: Date | null;
    type: string;
    status: string;
    demandeId: string | null;
    createdBy: string;
    subject: string;
    closedAt: Date | null;
}>;
export declare function listMessages(threadId: string): Promise<{
    id: string;
    threadId: string;
    senderId: string;
    senderName: string;
    senderRole: "AGENT";
    body: string;
    attachments: {
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
    }[];
    status: "SENT";
    readAt: null;
    createdAt: Date | null;
}[]>;
export declare function sendMessage(threadId: string, senderId: string, body: string, files: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
}[]): Promise<{
    id: string;
    threadId: string;
    senderId: string;
    senderName: string;
    senderRole: "AGENT";
    body: string;
    attachments: {
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
    }[];
    status: "SENT";
    readAt: null;
    createdAt: Date | null;
}>;
export declare function markThreadRead(threadId: string, userId: string): Promise<void>;
export {};
//# sourceMappingURL=messaging.service.d.ts.map