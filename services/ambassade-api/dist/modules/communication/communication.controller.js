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
exports.listCampagnes = listCampagnes;
exports.getCampagne = getCampagne;
exports.createCampagne = createCampagne;
exports.updateCampagne = updateCampagne;
exports.sendCampagne = sendCampagne;
exports.scheduleCampagne = scheduleCampagne;
exports.cancelCampagne = cancelCampagne;
exports.duplicateCampagne = duplicateCampagne;
exports.listDeliveries = listDeliveries;
exports.resendToFailed = resendToFailed;
exports.uploadAttachment = uploadAttachment;
exports.getCampagneFile = getCampagneFile;
exports.removeAttachment = removeAttachment;
exports.updateAttachment = updateAttachment;
exports.reorderAttachments = reorderAttachments;
exports.estimateRecipients = estimateRecipients;
const multer_1 = __importDefault(require("multer"));
const svc = __importStar(require("./communication.service"));
const dto_1 = require("./dto");
const dto_2 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "video/mp4", "video/webm", "application/pdf"];
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
async function listCampagnes(req, res) {
    const parsed = dto_1.listCampagnesQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.listCampagnes(parsed.data)));
}
async function getCampagne(req, res) {
    res.json((0, dto_2.ok)(await svc.getCampagne(req.params.id)));
}
async function createCampagne(req, res) {
    const parsed = dto_1.createCampagneDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.status(201).json((0, dto_2.ok)(await svc.createCampagne(parsed.data, actorOf(req))));
}
async function updateCampagne(req, res) {
    const parsed = dto_1.updateCampagneDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.updateCampagne(req.params.id, parsed.data)));
}
async function sendCampagne(req, res) {
    res.json((0, dto_2.ok)(await svc.sendCampagne(req.params.id, actorOf(req))));
}
async function scheduleCampagne(req, res) {
    const parsed = dto_1.scheduleCampagneDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.scheduleCampagne(req.params.id, parsed.data.scheduledAt)));
}
async function cancelCampagne(req, res) {
    res.json((0, dto_2.ok)(await svc.cancelCampagne(req.params.id)));
}
async function duplicateCampagne(req, res) {
    res.status(201).json((0, dto_2.ok)(await svc.duplicateCampagne(req.params.id, actorOf(req))));
}
async function listDeliveries(req, res) {
    res.json((0, dto_2.ok)(await svc.listDeliveries(req.params.id)));
}
async function resendToFailed(req, res) {
    res.json((0, dto_2.ok)(await svc.resendToFailed(req.params.id)));
}
async function uploadAttachment(req, res) {
    const file = req.file;
    if (!file)
        throw new utils_1.ValidationError("Fichier requis", { file: ["Required"] });
    if (file.size === 0)
        throw new utils_1.ValidationError("Le fichier est vide", { file: ["Empty file"] });
    const parsed = dto_1.uploadAttachmentDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const attachment = await svc.uploadAttachment(req.params.id, file.buffer, file.originalname, file.mimetype, parsed.data, actorOf(req));
    res.status(201).json((0, dto_2.ok)(attachment));
}
async function getCampagneFile(req, res) {
    const { buffer, contentType, filename } = await svc.getCampagneFile(req.params.id, req.params.fileId);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(filename)}"`);
    res.send(buffer);
}
async function removeAttachment(req, res) {
    await svc.removeAttachment(req.params.id, req.params.attachmentId);
    res.status(204).send();
}
async function updateAttachment(req, res) {
    const parsed = dto_1.updateAttachmentDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.updateAttachment(req.params.id, req.params.attachmentId, parsed.data)));
}
async function reorderAttachments(req, res) {
    const parsed = dto_1.reorderAttachmentsDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    await svc.reorderAttachments(req.params.id, parsed.data.orderedAttachmentIds);
    res.status(204).send();
}
async function estimateRecipients(req, res) {
    const parsed = dto_1.estimateRecipientsDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.estimateRecipients(parsed.data)));
}
//# sourceMappingURL=communication.controller.js.map