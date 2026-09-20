"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.getUnreadCount = getUnreadCount;
exports.markAsRead = markAsRead;
exports.markAllAsRead = markAllAsRead;
const ambassade_core_1 = require("@poramma/ambassade-core");
const dto_1 = require("@poramma/dto");
const connection_1 = require("../../db/connection");
const public_mappers_1 = require("../../shared/public-mappers");
const userIdOf = (req) => req.userId;
async function listNotifications(req, res) {
    const userId = userIdOf(req);
    const [rows, unreadCount] = await Promise.all([
        ambassade_core_1.notificationsLogic.listNotifications(connection_1.db, userId, { unreadOnly: req.query.unreadOnly === "true" }),
        ambassade_core_1.notificationsLogic.getUnreadCount(connection_1.db, userId),
    ]);
    res.json((0, dto_1.ok)({ notifications: rows.map(public_mappers_1.toPublicNotification), unreadCount }));
}
async function getUnreadCount(req, res) {
    res.json((0, dto_1.ok)({ unreadCount: await ambassade_core_1.notificationsLogic.getUnreadCount(connection_1.db, userIdOf(req)) }));
}
async function markAsRead(req, res) {
    await ambassade_core_1.notificationsLogic.markAsRead(connection_1.db, userIdOf(req), req.params.id);
    res.status(204).send();
}
async function markAllAsRead(req, res) {
    await ambassade_core_1.notificationsLogic.markAllAsRead(connection_1.db, userIdOf(req));
    res.status(204).send();
}
//# sourceMappingURL=notifications.controller.js.map