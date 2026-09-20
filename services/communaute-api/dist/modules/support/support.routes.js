"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const support_controller_1 = require("./support.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
router.post("/support", (0, middleware_1.rateLimit)("support", 5, 3600), (0, utils_1.asyncHandler)(support_controller_1.createTicket));
router.get("/support/tickets", (0, utils_1.asyncHandler)(support_controller_1.listMyTickets));
router.get("/support/tickets/:id", (0, utils_1.asyncHandler)(support_controller_1.getMyTicket));
router.post("/support/tickets/:id/messages", (0, middleware_1.rateLimit)("support-messages", 60, 3600), (0, utils_1.asyncHandler)(support_controller_1.replyToMyTicket));
router.post("/support/tickets/:id/resolve", (0, utils_1.asyncHandler)(support_controller_1.resolveMyTicket));
exports.default = router;
//# sourceMappingURL=support.routes.js.map