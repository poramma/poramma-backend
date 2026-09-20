"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
exports.listMyDocuments = listMyDocuments;
exports.getDocument = getDocument;
exports.uploadDocument = uploadDocument;
exports.downloadDocument = downloadDocument;
exports.deleteDocument = deleteDocument;
const multer_1 = __importDefault(require("multer"));
const ambassade_core_1 = require("@poramma/ambassade-core");
const dto_1 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const connection_1 = require("../../db/connection");
const public_mappers_1 = require("../../shared/public-mappers");
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
    return { userId: req.userId, roleName: null };
}
function userAgentOf(req) {
    const ua = req.headers["user-agent"];
    return typeof ua === "string" ? ua : null;
}
async function assertOwner(req, documentId) {
    const ownerId = await ambassade_core_1.documentsLogic.getDocumentOwnerId(connection_1.db, documentId);
    if (ownerId !== req.userId)
        throw new utils_1.ForbiddenError("Accès non autorisé à ce document");
}
async function listMyDocuments(req, res) {
    const docs = await ambassade_core_1.documentsLogic.listDocuments(connection_1.db, { ownerUserId: req.userId, limit: 200 });
    res.json((0, dto_1.ok)(docs.map(public_mappers_1.toPublicDocument)));
}
async function getDocument(req, res) {
    await assertOwner(req, req.params.id);
    const doc = await ambassade_core_1.documentsLogic.getDocument(connection_1.db, req.params.id);
    res.json((0, dto_1.ok)((0, public_mappers_1.toPublicDocument)(doc)));
}
async function uploadDocument(req, res) {
    const file = req.file;
    if (!file)
        throw new utils_1.ValidationError("Fichier requis", { file: ["Required"] });
    const parsed = dto_1.communityDocumentsDto.uploadDocumentDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    if (parsed.data.demandeId)
        await ambassade_core_1.demandesLogic.getOwnedDemande(connection_1.db, parsed.data.demandeId, req.userId);
    const doc = await ambassade_core_1.documentsLogic.uploadDocument(connection_1.db, file.buffer, file.originalname, file.mimetype, { ...parsed.data, ownerUserId: req.userId }, actorOf(req), req.ip, userAgentOf(req));
    res.status(201).json((0, dto_1.ok)((0, public_mappers_1.toPublicDocument)(doc)));
}
async function downloadDocument(req, res) {
    await assertOwner(req, req.params.id);
    const { buffer, contentType, filename } = await ambassade_core_1.documentsLogic.downloadDocument(connection_1.db, req.params.id, actorOf(req), req.ip, userAgentOf(req));
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
}
async function deleteDocument(req, res) {
    await assertOwner(req, req.params.id);
    await ambassade_core_1.documentsLogic.deleteDocument(connection_1.db, req.params.id, actorOf(req));
    res.status(204).send();
}
//# sourceMappingURL=documents.controller.js.map