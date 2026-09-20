import type { Db } from "../db-type";
export interface CreateNotificationParams {
    userId: string;
    type: string;
    title: string;
    body: string;
    payload?: Record<string, unknown> | null;
    actionUrl?: string | null;
    email?: {
        subject?: string;
        actionLabel?: string;
    };
}
export declare function sendEmailToUser(db: Db, userId: string, mail: {
    subject: string;
    title: string;
    paragraphs: string[];
    actionLabel?: string;
    actionPath?: string | null;
}): Promise<void>;
export declare function createNotification(db: Db, params: CreateNotificationParams): Promise<void>;
export declare function listNotifications(db: Db, userId: string, opts?: {
    unreadOnly?: boolean;
    limit?: number;
}): Promise<{
    id: string;
    userId: string;
    type: string;
    title: string;
    body: string;
    payload: unknown;
    channel: string;
    status: string;
    actionUrl: string | null;
    createdAt: Date | null;
    sentAt: Date | null;
    readAt: Date | null;
}[]>;
export declare function getUnreadCount(db: Db, userId: string): Promise<number>;
export declare function markAsRead(db: Db, userId: string, notificationId: string): Promise<void>;
export declare function markAllAsRead(db: Db, userId: string): Promise<void>;
export declare const demandeActionUrl: (demandeId: string) => string;
export declare function demandeStatusMessage(status: string, ctx: {
    dossierNumber: string;
    serviceName?: string | null;
    agentComment?: string | null;
}): {
    title: string;
    body: string;
    tone: "info" | "success" | "warning" | "error";
} | null;
export declare const RENDEZ_VOUS_ACTION_URL = "/services/rendez-vous";
export type RendezVousEvent = "BOOKED" | "RESCHEDULED" | "CONFIRMED" | "CANCELLED_BY_USER" | "CANCELLED_BY_AGENT" | "NO_SHOW";
export declare function rendezVousMessage(event: RendezVousEvent, ctx: {
    ticketId: string;
    serviceName?: string | null;
    date: string;
    startTime: string;
}): {
    title: string;
    body: string;
};
export declare function notifyRendezVous(db: Db, params: {
    userId: string;
    rendezVousId: string;
    event: RendezVousEvent;
    ticketId: string;
    serviceName?: string | null;
    date: string;
    startTime: string;
}): Promise<void>;
export declare function rendezVousEventForStatus(status: string): RendezVousEvent | null;
export declare const DEMANDE_EMAIL_STATUSES: Set<string>;
export declare const REGISTRATION_ACTION_URL = "/enregistrement";
export declare function notifyRegistrationDecision(db: Db, params: {
    userId: string;
    decision: "VALIDATED" | "REJECTED" | "SUSPENDED" | "INUE_ASSIGNED";
    inue?: string | null;
    note?: string | null;
}): Promise<void>;
export declare function notifyDemandeStatusChange(db: Db, params: {
    userId: string;
    demandeId: string;
    dossierNumber: string;
    serviceName?: string | null;
    status: string;
    agentComment?: string | null;
}): Promise<{
    title: string;
    body: string;
} | null>;
//# sourceMappingURL=notifications.d.ts.map