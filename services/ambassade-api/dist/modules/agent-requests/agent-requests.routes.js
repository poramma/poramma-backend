"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const agent_requests_controller_1 = require("./agent-requests.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
router.get("/agent-requests/mine", (0, utils_1.asyncHandler)(agent_requests_controller_1.listMine));
router.post("/agent-requests", (0, utils_1.asyncHandler)(agent_requests_controller_1.createRequest));
router.get("/agent-requests", (0, middleware_1.requirePermission)("user:admin"), (0, utils_1.asyncHandler)(agent_requests_controller_1.listAll));
router.get("/agent-requests/:id", (0, utils_1.asyncHandler)(agent_requests_controller_1.getOne));
router.patch("/agent-requests/:id", (0, middleware_1.requirePermission)("user:admin"), (0, utils_1.asyncHandler)(agent_requests_controller_1.processRequest));
exports.default = router;
//# sourceMappingURL=agent-requests.routes.js.map