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
exports.listInternalDocuments = listInternalDocuments;
exports.getInternalDocument = getInternalDocument;
exports.createInternalDocument = createInternalDocument;
exports.shareInternalDocument = shareInternalDocument;
exports.downloadInternalDocument = downloadInternalDocument;
const multer_1 = __importDefault(require("multer"));
const svc = __importStar(require("./internal-documents.service"));
const dto_1 = require("./dto");
const dto_2 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
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
    return {
        userId: req.userId,
        roleId: req.roleId,
        roleName: req.roleName,
    };
}
function userAgentOf(req) {
    const ua = req.headers["user-agent"];
    return typeof ua === "string" ? ua : null;
}
async function listInternalDocuments(req, res) {
    const parsed = dto_1.listInternalDocumentsQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.listInternalDocuments(actorOf(req), parsed.data)));
}
async function getInternalDocument(req, res) {
    res.json((0, dto_2.ok)(await svc.getInternalDocument(req.params.id, actorOf(req))));
}
async function createInternalDocument(req, res) {
    const file = req.file;
    if (!file)
        throw new utils_1.ValidationError("Fichier requis", { file: ["Required"] });
    const parsed = dto_1.createInternalDocumentDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const doc = await svc.createInternalDocument(file.buffer, file.originalname, file.mimetype, parsed.data, actorOf(req), req.ip, userAgentOf(req));
    res.status(201).json((0, dto_2.ok)(doc));
}
async function shareInternalDocument(req, res) {
    const parsed = dto_1.shareInternalDocumentDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.shareInternalDocument(req.params.id, parsed.data, actorOf(req))));
}
async function downloadInternalDocument(req, res) {
    const { buffer, contentType, filename } = await svc.downloadInternalDocument(req.params.id, actorOf(req), req.ip, userAgentOf(req));
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
}
//# sourceMappingURL=internal-documents.controller.js.map