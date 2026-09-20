"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_controller_1 = require("./notifications.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
router.get("/notifications", (0, utils_1.asyncHandler)(notifications_controller_1.listNotifications));
router.get("/notifications/unread-count", (0, utils_1.asyncHandler)(notifications_controller_1.getUnreadCount));
router.patch("/notifications/read-all", (0, utils_1.asyncHandler)(notifications_controller_1.markAllAsRead));
router.patch("/notifications/:id/read", (0, utils_1.asyncHandler)(notifications_controller_1.markAsRead));
exports.default = router;
//# sourceMappingURL=notifications.routes.js.map