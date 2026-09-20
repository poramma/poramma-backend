"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const services_controller_1 = require("./services.controller");
const utils_1 = require("@poramma/utils");
const middleware_1 = require("../../shared/middleware");
const router = (0, express_1.Router)();
const limit = (0, middleware_1.rateLimit)("services", 100, 3600);
router.get("/services", limit, (0, utils_1.asyncHandler)(services_controller_1.listServices));
router.get("/services/:id", limit, (0, utils_1.asyncHandler)(services_controller_1.getService));
router.get("/services/:id/sub-services", limit, (0, utils_1.asyncHandler)(services_controller_1.getServiceSubServices));
router.get("/sub-services/:id", limit, (0, utils_1.asyncHandler)(services_controller_1.getSubService));
exports.default = router;
//# sourceMappingURL=services.routes.js.map