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
exports.listThreads = listThreads;
exports.getThread = getThread;
exports.createThread = createThread;
exports.addParticipant = addParticipant;
exports.updateThreadStatus = updateThreadStatus;
exports.listMessages = listMessages;
exports.sendMessage = sendMessage;
exports.markThreadRead = markThreadRead;
const multer_1 = __importDefault(require("multer"));
const svc = __importStar(require("./messaging.service"));
const dto_1 = require("./dto");
const dto_2 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
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
async function listThreads(req, res) {
    const parsed = dto_1.listThreadsQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Filtres invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.listThreads(req.userId, parsed.data.demandeId)));
}
async function getThread(req, res) {
    await svc.assertParticipant(req.params.id, req.userId);
    res.json((0, dto_2.ok)(await svc.getThread(req.params.id, req.userId)));
}
async function createThread(req, res) {
    const parsed = dto_1.createThreadDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.status(201).json((0, dto_2.ok)(await svc.createThread(parsed.data, actorOf(req))));
}
async function addParticipant(req, res) {
    await svc.assertParticipant(req.params.id, req.userId);
    const parsed = dto_1.addParticipantDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.addParticipant(req.params.id, parsed.data.userId)));
}
async function updateThreadStatus(req, res) {
    await svc.assertParticipant(req.params.id, req.userId);
    const parsed = dto_1.updateThreadStatusDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    res.json((0, dto_2.ok)(await svc.updateThreadStatus(req.params.id, parsed.data.status)));
}
async function listMessages(req, res) {
    await svc.assertParticipant(req.params.id, req.userId);
    res.json((0, dto_2.ok)(await svc.listMessages(req.params.id)));
}
async function sendMessage(req, res) {
    await svc.assertParticipant(req.params.id, req.userId);
    const parsed = dto_1.sendMessageDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const files = req.files ?? [];
    const message = await svc.sendMessage(req.params.id, req.userId, parsed.data.body, files);
    res.status(201).json((0, dto_2.ok)(message));
}
async function markThreadRead(req, res) {
    await svc.assertParticipant(req.params.id, req.userId);
    await svc.markThreadRead(req.params.id, req.userId);
    res.status(204).send();
}
//# sourceMappingURL=messaging.controller.js.map