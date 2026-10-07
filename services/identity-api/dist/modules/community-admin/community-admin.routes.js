"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const utils_1 = require("@poramma/utils");
const middleware_1 = require("../../shared/middleware");
const community_admin_controller_1 = require("./community-admin.controller");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
router.patch("/members/:id/status", (0, middleware_1.requirePermission)("community:user:manage"), (0, utils_1.asyncHandler)(community_admin_controller_1.setMemberStatus));
router.get("/team", (0, middleware_1.requirePermission)("community:team:read"), (0, utils_1.asyncHandler)(community_admin_controller_1.listTeam));
router.post("/team", (0, middleware_1.requirePermission)("community:team:manage"), (0, utils_1.asyncHandler)(community_admin_controller_1.addTeamMember));
router.patch("/team/:userId", (0, middleware_1.requirePermission)("community:team:manage"), (0, utils_1.asyncHandler)(community_admin_controller_1.changeTeamRole));
router.delete("/team/:userId", (0, middleware_1.requirePermission)("community:team:manage"), (0, utils_1.asyncHandler)(community_admin_controller_1.removeTeamMember));
exports.default = router;
//# sourceMappingURL=community-admin.routes.js.map