"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.getUnreadCount = getUnreadCount;
exports.markAsRead = markAsRead;
exports.markAllAsRead = markAllAsRead;
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../db/connection");
const schema_communication_1 = require("../../db/schema.communication");
const utils_1 = require("@poramma/utils");
async function listNotifications(userId, filters) {
    const conditions = [(0, drizzle_orm_1.eq)(schema_communication_1.notifications.userId, userId)];
    if (filters.type)
        conditions.push((0, drizzle_orm_1.eq)(schema_communication_1.notifications.type, filters.type));
    if (filters.status)
        conditions.push((0, drizzle_orm_1.eq)(schema_communication_1.notifications.status, filters.status));
    if (filters.unreadOnly)
        conditions.push((0, drizzle_orm_1.eq)(schema_communication_1.notifications.status, "SENT"));
    return connection_1.db
        .select()
        .from(schema_communication_1.notifications)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(schema_communication_1.notifications.createdAt))
        .limit(100);
}
async function getUnreadCount(userId) {
    const rows = await connection_1.db
        .select()
        .from(schema_communication_1.notifications)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_communication_1.notifications.userId, userId), (0, drizzle_orm_1.eq)(schema_communication_1.notifications.status, "SENT")));
    return rows.length;
}
async function markAsRead(userId, notificationId) {
    const [existing] = await connection_1.db.select().from(schema_communication_1.notifications).where((0, drizzle_orm_1.eq)(schema_communication_1.notifications.id, notificationId));
    if (!existing)
        throw new utils_1.NotFoundError("Notification introuvable");
    if (existing.userId !== userId)
        throw new utils_1.ForbiddenError("Accès non autorisé à cette notification");
    await connection_1.db.update(schema_communication_1.notifications).set({ status: "READ", readAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_communication_1.notifications.id, notificationId));
}
async function markAllAsRead(userId) {
    await connection_1.db
        .update(schema_communication_1.notifications)
        .set({ status: "READ", readAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_communication_1.notifications.userId, userId), (0, drizzle_orm_1.eq)(schema_communication_1.notifications.status, "SENT")));
}
//# sourceMappingURL=notifications.service.js.map