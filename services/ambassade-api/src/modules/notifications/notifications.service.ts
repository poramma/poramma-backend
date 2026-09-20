import { eq, and, desc } from "drizzle-orm";
import { db } from "../../db/connection";
import { notifications } from "../../db/schema.communication";
import { NotFoundError, ForbiddenError } from "@poramma/utils";

interface NotificationFilters {
  type?: string;
  status?: string;
  unreadOnly?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export async function listNotifications(userId: string, filters: NotificationFilters) {
  const conditions = [eq(notifications.userId, userId)];
  if (filters.type) conditions.push(eq(notifications.type, filters.type));
  if (filters.status) conditions.push(eq(notifications.status, filters.status));
  if (filters.unreadOnly) conditions.push(eq(notifications.status, "SENT"));

  return db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
}

export async function getUnreadCount(userId: string) {
  const rows = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.status, "SENT")));
  return rows.length;
}

export async function markAsRead(userId: string, notificationId: string) {
  const [existing] = await db.select().from(notifications).where(eq(notifications.id, notificationId));
  if (!existing) throw new NotFoundError("Notification introuvable");
  if (existing.userId !== userId) throw new ForbiddenError("Accès non autorisé à cette notification");

  await db.update(notifications).set({ status: "READ", readAt: new Date() }).where(eq(notifications.id, notificationId));
}

export async function markAllAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ status: "READ", readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.status, "SENT")));
}
