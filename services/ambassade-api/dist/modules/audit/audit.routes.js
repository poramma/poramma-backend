"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_controller_1 = require("./audit.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
router.get("/audit/me", (0, utils_1.asyncHandler)(audit_controller_1.listMyActivity));
router.get("/audit/stats", (0, middleware_1.requirePermission)("audit:read"), (0, utils_1.asyncHandler)(audit_controller_1.getStats));
router.post("/audit/export", (0, middleware_1.requirePermission)("audit:export"), (0, utils_1.asyncHandler)(audit_controller_1.exportLogs));
router.get("/audit/logs", (0, middleware_1.requirePermission)("audit:read"), (0, utils_1.asyncHandler)(audit_controller_1.listLogs));
router.get("/audit/logs/:id", (0, middleware_1.requirePermission)("audit:read"), (0, utils_1.asyncHandler)(audit_controller_1.getLog));
exports.default = router;
//# sourceMappingURL=audit.routes.js.map