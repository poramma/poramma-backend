interface NotificationFilters {
    type?: string;
    status?: string;
    unreadOnly?: boolean;
    dateFrom?: string;
    dateTo?: string;
}
export declare function listNotifications(userId: string, filters: NotificationFilters): Promise<{
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
export declare function getUnreadCount(userId: string): Promise<number>;
export declare function markAsRead(userId: string, notificationId: string): Promise<void>;
export declare function markAllAsRead(userId: string): Promise<void>;
export {};
//# sourceMappingURL=notifications.service.d.ts.map