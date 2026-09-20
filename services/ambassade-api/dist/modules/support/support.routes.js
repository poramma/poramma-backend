"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const utils_1 = require("@poramma/utils");
const middleware_1 = require("../../shared/middleware");
const support_controller_1 = require("./support.controller");
const router = (0, express_1.Router)();
router.get("/support-tickets", middleware_1.requireAuth, (0, middleware_1.requirePermission)("user:admin"), (0, utils_1.asyncHandler)(support_controller_1.listTickets));
router.get("/support-tickets/assignees", middleware_1.requireAuth, (0, middleware_1.requirePermission)("user:admin"), (0, utils_1.asyncHandler)(support_controller_1.listAssignees));
router.get("/support-tickets/:id", middleware_1.requireAuth, (0, middleware_1.requirePermission)("user:admin"), (0, utils_1.asyncHandler)(support_controller_1.getTicket));
router.post("/support-tickets/:id/messages", middleware_1.requireAuth, (0, middleware_1.requirePermission)("user:admin"), (0, utils_1.asyncHandler)(support_controller_1.addMessage));
router.patch("/support-tickets/:id", middleware_1.requireAuth, (0, middleware_1.requirePermission)("user:admin"), (0, utils_1.asyncHandler)(support_controller_1.updateTicket));
exports.default = router;
//# sourceMappingURL=support.routes.js.map