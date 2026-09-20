export declare function getMyProfile(userId: string): Promise<{
    agent: {
        id: string;
        userId: string;
        user: import("../auth/auth.service").FullUser;
        matricule: string;
        roleTitle: string | null;
        department: string;
        officeNumber: string | null;
        signatureUrl: string | null;
        active: boolean | null;
        hiredAt: Date;
        createdAt: Date | null;
        updatedAt: Date | null;
    };
    user: import("../auth/auth.service").FullUser;
    profile: any;
    roles: any[];
    activeRole: any;
    assignments: {
        subService: {
            id: string;
            name: string;
            code: string | null;
            description: string | null;
            service: {
                id: string | null;
                name: string | null;
            };
        } | null;
        id: string;
        agentId: string;
        subServiceId: string;
        assignedBy: string | null;
        assignedAt: Date | null;
        validFrom: string | null;
        validUntil: string | null;
        isPrimary: boolean | null;
        maxDailyAppointments: number | null;
        notes: string | null;
        active: boolean | null;
    }[];
    availabilities: {
        id: string;
        agentId: string;
        dayOfWeek: number;
        startTime: string | null;
        endTime: string | null;
        isAvailable: boolean | null;
        validFrom: string | null;
        validUntil: string | null;
    }[];
    exceptions: {
        id: string;
        agentId: string;
        date: string;
        type: string;
        reason: string;
        isFullDay: boolean | null;
        startTime: string | null;
        endTime: string | null;
        createdBy: string | null;
        createdAt: Date | null;
    }[];
    preferences: {
        theme: "system";
        language: "fr";
        notificationsEmail: boolean;
        notificationsInApp: boolean;
        notificationTypes: {
            demandeAssigned: boolean;
            documentPending: boolean;
            rendezVousReminder: boolean;
        };
    };
    activities: {
        id: string;
        agentUserId: string;
        action: string;
        targetType: string;
        targetLabel: string;
        targetId: string;
        createdAt: Date | null;
    }[];
}>;
export declare function updateMyProfile(userId: string, data: Record<string, unknown>): Promise<{
    id: string;
    userId: string;
    inue: string | null;
    userType: string | null;
    firstName: string | null;
    lastName: string | null;
    bio: string | null;
    birthDate: string | null;
    nationality: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    zipCode: string | null;
    gender: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}>;
export declare function updateMyPreferences(userId: string, patch: Record<string, unknown>): Promise<{
    theme: "system";
    language: "fr";
    notificationsEmail: boolean;
    notificationsInApp: boolean;
    notificationTypes: {
        demandeAssigned: boolean;
        documentPending: boolean;
        rendezVousReminder: boolean;
    };
}>;
export declare function updateMyPassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
export declare function uploadSignature(userId: string, buffer: Buffer, originalName: string, mimeType: string): Promise<{
    signatureUrl: string | null;
}>;
export declare function getSignatureFile(userId: string): Promise<{
    buffer: Buffer<ArrayBufferLike>;
    contentType: string;
}>;
export declare function deleteSignature(userId: string): Promise<void>;
export declare function listActivities(userId: string, offset: number, limit: number): Promise<{
    id: string;
    agentUserId: string;
    action: string;
    targetType: string;
    targetLabel: string;
    targetId: string;
    createdAt: Date | null;
}[]>;
export declare function recordActivity(agentUserId: string, action: string, targetType: string, targetLabel: string, targetId: string): Promise<void>;
//# sourceMappingURL=profile.service.d.ts.map