"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const culture_controller_1 = require("./culture.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
const guard = (0, middleware_1.requirePermission)("culture:manage");
router.get("/culture/overview", guard, (0, utils_1.asyncHandler)(culture_controller_1.getOverview));
router.get("/culture/threads", guard, (0, utils_1.asyncHandler)(culture_controller_1.listThreads));
router.get("/culture/threads/:id", guard, (0, utils_1.asyncHandler)(culture_controller_1.getThread));
router.post("/culture/threads/:id/messages", guard, (0, utils_1.asyncHandler)(culture_controller_1.addMessage));
router.patch("/culture/threads/:id", guard, (0, utils_1.asyncHandler)(culture_controller_1.setStatus));
exports.default = router;
//# sourceMappingURL=culture.routes.js.map