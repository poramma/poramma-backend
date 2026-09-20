"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const messaging_controller_1 = require("./messaging.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
router.use((0, middleware_1.requirePermission)("message:read"));
router.get("/threads", (0, utils_1.asyncHandler)(messaging_controller_1.listThreads));
router.post("/threads", (0, middleware_1.requirePermission)("message:create"), (0, utils_1.asyncHandler)(messaging_controller_1.createThread));
router.get("/threads/:id", (0, utils_1.asyncHandler)(messaging_controller_1.getThread));
router.post("/threads/:id/participants", (0, utils_1.asyncHandler)(messaging_controller_1.addParticipant));
router.patch("/threads/:id/status", (0, utils_1.asyncHandler)(messaging_controller_1.updateThreadStatus));
router.patch("/threads/:id/read", (0, utils_1.asyncHandler)(messaging_controller_1.markThreadRead));
router.get("/threads/:id/messages", (0, utils_1.asyncHandler)(messaging_controller_1.listMessages));
router.post("/threads/:id/messages", (0, middleware_1.requirePermission)("message:create"), messaging_controller_1.upload.array("files", 5), (0, utils_1.asyncHandler)(messaging_controller_1.sendMessage));
exports.default = router;
//# sourceMappingURL=messaging.routes.js.map