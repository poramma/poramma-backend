"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
exports.listCategories = listCategories;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.deleteCategory = deleteCategory;
exports.listDocuments = listDocuments;
exports.getDocument = getDocument;
exports.uploadDocument = uploadDocument;
exports.addVersion = addVersion;
exports.listVersions = listVersions;
exports.downloadDocument = downloadDocument;
exports.validateDocument = validateDocument;
exports.archiveDocument = archiveDocument;
exports.getStats = getStats;
exports.listAudit = listAudit;
const multer_1 = __importDefault(require("multer"));
const svc = __importStar(require("./documents.service"));
const dto_1 = require("./dto");
const dto_2 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];
exports.upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(new utils_1.ValidationError("Type de fichier non autorisé", { file: [`${file.mimetype} not allowed`] }));
            return;
        }
        cb(null, true);
    },
});
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
function actorOf(req) {
    return { userId: req.userId, roleName: req.roleName };
}
function userAgentOf(req) {
    const ua = req.headers["user-agent"];
    return typeof ua === "string" ? ua : null;
}
function hasStaffReadAccess(req) {
    const permissions = req.permissions || [];
    return permissions.includes("document:read");
}
async function assertCanAccessDocument(req, documentId) {
    if (hasStaffReadAccess(req))
        return;
    const ownerId = await svc.getDocumentOwnerId(documentId);
    if (ownerId !== req.userId)
        throw new utils_1.ForbiddenError("Accès non autorisé à ce document");
}
async function listCategories(req, res) {
    res.json((0, dto_2.ok)(await svc.listCategories()));
}
async function createCategory(req, res) {
    const parsed = dto_1.createCategoryDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.status(201).json((0, dto_2.ok)(await svc.createCategory(parsed.data)));
}
async function updateCategory(req, res) {
    const parsed = dto_1.updateCategoryDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.updateCategory(req.params.id, parsed.data)));
}
async function deleteCategory(req, res) {
    await svc.deleteCategory(req.params.id);
    res.status(204).send();
}
async function listDocuments(req, res) {
    const parsed = dto_1.listDocumentsQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.listDocuments(parsed.data)));
}
async function getDocument(req, res) {
    await assertCanAccessDocument(req, req.params.id);
    const doc = await svc.getDocument(req.params.id);
    await svc.logView(req.params.id, actorOf(req), req.ip, userAgentOf(req));
    res.json((0, dto_2.ok)(doc));
}
async function uploadDocument(req, res) {
    const file = req.file;
    if (!file)
        throw new utils_1.ValidationError("Fichier requis", { file: ["Required"] });
    const parsed = dto_1.uploadDocumentDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const permissions = req.permissions || [];
    const isStaffUploader = permissions.includes("document:upload");
    const ownerUserId = isStaffUploader ? parsed.data.ownerUserId : req.userId;
    const doc = await svc.uploadDocument(file.buffer, file.originalname, file.mimetype, { ...parsed.data, ownerUserId }, actorOf(req), req.ip, userAgentOf(req));
    res.status(201).json((0, dto_2.ok)(doc));
}
async function addVersion(req, res) {
    await assertCanAccessDocument(req, req.params.id);
    const file = req.file;
    if (!file)
        throw new utils_1.ValidationError("Fichier requis", { file: ["Required"] });
    const changeNote = typeof req.body.changeNote === "string" ? req.body.changeNote : undefined;
    const doc = await svc.addDocumentVersion(req.params.id, file.buffer, file.originalname, file.mimetype, changeNote, actorOf(req));
    res.status(201).json((0, dto_2.ok)(doc));
}
async function listVersions(req, res) {
    await assertCanAccessDocument(req, req.params.id);
    res.json((0, dto_2.ok)(await svc.listVersions(req.params.id)));
}
async function downloadDocument(req, res) {
    await assertCanAccessDocument(req, req.params.id);
    const { buffer, contentType, filename } = await svc.downloadDocument(req.params.id, actorOf(req), req.ip, userAgentOf(req));
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
}
async function validateDocument(req, res) {
    const parsed = dto_1.validateDocumentDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.validateDocument(req.params.id, parsed.data.status, parsed.data.reviewNote, actorOf(req))));
}
async function archiveDocument(req, res) {
    res.json((0, dto_2.ok)(await svc.archiveDocument(req.params.id, actorOf(req))));
}
async function getStats(req, res) {
    res.json((0, dto_2.ok)(await svc.getStats()));
}
async function listAudit(req, res) {
    const parsed = dto_1.auditQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.listAudit(parsed.data.documentId, parsed.data.limit ?? 50)));
}
//# sourceMappingURL=documents.controller.js.map