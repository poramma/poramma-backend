"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const demandes_controller_1 = require("./demandes.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
router.get("/demandes", (0, utils_1.asyncHandler)(demandes_controller_1.listMyDemandes));
router.post("/demandes", middleware_1.requireValidatedProfile, (0, middleware_1.rateLimit)("demandes-create", 20, 3600), (0, utils_1.asyncHandler)(demandes_controller_1.createDemande));
router.get("/demandes/:id", (0, utils_1.asyncHandler)(demandes_controller_1.getDemande));
router.get("/demandes/:id/history", (0, utils_1.asyncHandler)(demandes_controller_1.listHistory));
router.get("/demandes/:id/requirements", (0, utils_1.asyncHandler)(demandes_controller_1.listRequirements));
router.get("/demandes/:id/documents", (0, utils_1.asyncHandler)(demandes_controller_1.listDemandeDocuments));
router.get("/demandes/:id/comments", (0, utils_1.asyncHandler)(demandes_controller_1.listComments));
router.post("/demandes/:id/comments", middleware_1.requireValidatedProfile, (0, middleware_1.rateLimit)("messages", 60, 3600), (0, utils_1.asyncHandler)(demandes_controller_1.addComment));
exports.default = router;
//# sourceMappingURL=demandes.routes.js.map