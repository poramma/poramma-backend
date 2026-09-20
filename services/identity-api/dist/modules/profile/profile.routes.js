"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_1 = require("./profile.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
router.get("/", (0, utils_1.asyncHandler)(profile_controller_1.getMyProfile));
router.patch("/", (0, utils_1.asyncHandler)(profile_controller_1.updateMyProfile));
router.patch("/preferences", (0, utils_1.asyncHandler)(profile_controller_1.updateMyPreferences));
router.post("/password", (0, utils_1.asyncHandler)(profile_controller_1.updateMyPassword));
router.get("/activities", (0, utils_1.asyncHandler)(profile_controller_1.getMyActivities));
router.post("/signature", profile_controller_1.uploadSignatureMiddleware.single("file"), (0, utils_1.asyncHandler)(profile_controller_1.uploadSignature));
router.get("/signature", (0, utils_1.asyncHandler)(profile_controller_1.getSignature));
router.delete("/signature", (0, utils_1.asyncHandler)(profile_controller_1.deleteSignature));
exports.default = router;
//# sourceMappingURL=profile.routes.js.map