"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const documents_controller_1 = require("./documents.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
router.get("/documents", (0, utils_1.asyncHandler)(documents_controller_1.listMyDocuments));
router.post("/documents", (0, middleware_1.rateLimit)("documents-upload", 30, 3600), documents_controller_1.upload.single("file"), (0, utils_1.asyncHandler)(documents_controller_1.uploadDocument));
router.get("/documents/:id", (0, utils_1.asyncHandler)(documents_controller_1.getDocument));
router.get("/documents/:id/download", (0, utils_1.asyncHandler)(documents_controller_1.downloadDocument));
router.delete("/documents/:id", (0, utils_1.asyncHandler)(documents_controller_1.deleteDocument));
exports.default = router;
//# sourceMappingURL=documents.routes.js.map