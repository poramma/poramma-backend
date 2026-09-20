"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const internal_documents_controller_1 = require("./internal-documents.controller");
const middleware_1 = require("../../shared/middleware");
const utils_1 = require("@poramma/utils");
const router = (0, express_1.Router)();
router.use(middleware_1.requireAuth);
router.get("/internal-documents", (0, middleware_1.requirePermission)("document:read"), (0, utils_1.asyncHandler)(internal_documents_controller_1.listInternalDocuments));
router.post("/internal-documents", (0, middleware_1.requirePermission)("document:upload"), internal_documents_controller_1.upload.single("file"), (0, utils_1.asyncHandler)(internal_documents_controller_1.createInternalDocument));
router.get("/internal-documents/:id", (0, middleware_1.requirePermission)("document:read"), (0, utils_1.asyncHandler)(internal_documents_controller_1.getInternalDocument));
router.get("/internal-documents/:id/download", (0, middleware_1.requirePermission)("document:read"), (0, utils_1.asyncHandler)(internal_documents_controller_1.downloadInternalDocument));
router.patch("/internal-documents/:id/share", (0, middleware_1.requirePermission)("document:share"), (0, utils_1.asyncHandler)(internal_documents_controller_1.shareInternalDocument));
exports.default = router;
//# sourceMappingURL=internal-documents.routes.js.map