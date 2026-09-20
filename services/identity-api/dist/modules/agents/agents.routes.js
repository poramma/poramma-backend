"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const agents_controller_1 = require("./agents.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
router.get("/", (0, middleware_1.requirePermission)("user:read"), (0, utils_1.asyncHandler)(agents_controller_1.listAgents));
router.get("/:id", (0, middleware_1.requirePermission)("user:read"), (0, utils_1.asyncHandler)(agents_controller_1.getAgent));
router.post("/", (0, middleware_1.requirePermission)("user:create"), (0, utils_1.asyncHandler)(agents_controller_1.createAgent));
router.patch("/:id", (0, middleware_1.requirePermission)("user:update"), (0, utils_1.asyncHandler)(agents_controller_1.updateAgent));
router.delete("/:id", (0, middleware_1.requirePermission)("user:delete"), (0, utils_1.asyncHandler)(agents_controller_1.deleteAgent));
exports.default = router;
//# sourceMappingURL=agents.routes.js.map