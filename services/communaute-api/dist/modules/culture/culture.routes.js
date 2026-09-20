"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const culture_controller_1 = require("./culture.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
router.get("/culture", (0, utils_1.asyncHandler)(culture_controller_1.overview));
router.get("/culture/threads", (0, utils_1.asyncHandler)(culture_controller_1.listMyThreads));
router.post("/culture/threads", middleware_1.requireValidatedProfile, (0, middleware_1.rateLimit)("culture", 10, 3600), (0, utils_1.asyncHandler)(culture_controller_1.createThread));
router.get("/culture/threads/:id", (0, utils_1.asyncHandler)(culture_controller_1.getMyThread));
router.post("/culture/threads/:id/messages", middleware_1.requireValidatedProfile, (0, middleware_1.rateLimit)("culture-messages", 60, 3600), (0, utils_1.asyncHandler)(culture_controller_1.replyToMyThread));
exports.default = router;
//# sourceMappingURL=culture.routes.js.map