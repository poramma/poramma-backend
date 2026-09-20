"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.campagnesMediaRouter = void 0;
const express_1 = require("express");
const campagnes_controller_1 = require("./campagnes.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
exports.campagnesMediaRouter = (0, express_1.Router)();
exports.campagnesMediaRouter.get("/campagnes/media/:fileId", (0, utils_1.asyncHandler)(campagnes_controller_1.streamMedia));
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
const interactionLimit = (0, middleware_1.rateLimit)("campagnes", 120, 3600);
router.get("/campagnes", (0, utils_1.asyncHandler)(campagnes_controller_1.listCampagnes));
router.get("/campagnes/:id", (0, utils_1.asyncHandler)(campagnes_controller_1.getCampagne));
router.post("/campagnes/:id/view", interactionLimit, (0, utils_1.asyncHandler)(campagnes_controller_1.recordView));
router.post("/campagnes/:id/click", interactionLimit, (0, utils_1.asyncHandler)(campagnes_controller_1.recordClick));
router.post("/campagnes/:id/reactions/:type", interactionLimit, (0, utils_1.asyncHandler)(campagnes_controller_1.toggleReaction));
exports.default = router;
//# sourceMappingURL=campagnes.routes.js.map