"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_1 = require("./profile.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
router.get("/profile/status", (0, utils_1.asyncHandler)(profile_controller_1.getProfileStatus));
router.get("/profile/registration", (0, utils_1.asyncHandler)(profile_controller_1.getRegistration));
router.post("/profile/registration/submit", (0, middleware_1.rateLimit)("registration-submit", 10, 3600), (0, utils_1.asyncHandler)(profile_controller_1.submitRegistration));
exports.default = router;
//# sourceMappingURL=profile.routes.js.map