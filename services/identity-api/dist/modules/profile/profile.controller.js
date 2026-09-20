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
exports.uploadSignatureMiddleware = void 0;
exports.getMyProfile = getMyProfile;
exports.updateMyProfile = updateMyProfile;
exports.updateMyPreferences = updateMyPreferences;
exports.updateMyPassword = updateMyPassword;
exports.uploadSignature = uploadSignature;
exports.getSignature = getSignature;
exports.deleteSignature = deleteSignature;
exports.getMyActivities = getMyActivities;
const multer_1 = __importDefault(require("multer"));
const profileService = __importStar(require("./profile.service"));
const dto_1 = require("./dto");
const dto_2 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const SIGNATURE_MAX_SIZE = 2 * 1024 * 1024;
const SIGNATURE_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
exports.uploadSignatureMiddleware = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: SIGNATURE_MAX_SIZE },
    fileFilter: (_req, file, cb) => {
        if (!SIGNATURE_MIME_TYPES.includes(file.mimetype)) {
            cb(new utils_1.ValidationError("Type de fichier non autorisé pour une signature", { file: [`${file.mimetype} not allowed`] }));
            return;
        }
        cb(null, true);
    },
});
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
async function getMyProfile(req, res) {
    const userId = req.userId;
    res.json((0, dto_2.ok)(await profileService.getMyProfile(userId)));
}
async function updateMyProfile(req, res) {
    const parsed = dto_1.updateOwnProfileDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const userId = req.userId;
    res.json((0, dto_2.ok)(await profileService.updateMyProfile(userId, parsed.data)));
}
async function updateMyPreferences(req, res) {
    const parsed = dto_1.updatePreferencesDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const userId = req.userId;
    res.json((0, dto_2.ok)(await profileService.updateMyPreferences(userId, parsed.data)));
}
async function updateMyPassword(req, res) {
    const parsed = dto_1.updatePasswordDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const userId = req.userId;
    await profileService.updateMyPassword(userId, parsed.data.currentPassword, parsed.data.newPassword);
    res.json((0, dto_2.ok)(null, undefined, "Mot de passe mis à jour."));
}
async function uploadSignature(req, res) {
    const file = req.file;
    if (!file)
        throw new utils_1.ValidationError("Fichier requis", { file: ["Required"] });
    const userId = req.userId;
    res.json((0, dto_2.ok)(await profileService.uploadSignature(userId, file.buffer, file.originalname, file.mimetype)));
}
async function getSignature(req, res) {
    const userId = req.userId;
    const { buffer, contentType } = await profileService.getSignatureFile(userId);
    res.setHeader("Content-Type", contentType);
    res.send(buffer);
}
async function deleteSignature(req, res) {
    const userId = req.userId;
    await profileService.deleteSignature(userId);
    res.json((0, dto_2.ok)(null, undefined, "Signature supprimée."));
}
async function getMyActivities(req, res) {
    const parsed = dto_1.activitiesQueryDto.safeParse(req.query);
    if (!parsed.success)
        throw new utils_1.ValidationError("Paramètres invalides", zodDetails(parsed.error));
    const userId = req.userId;
    const activities = await profileService.listActivities(userId, parsed.data.offset, parsed.data.limit);
    res.json((0, dto_2.ok)(activities));
}
//# sourceMappingURL=profile.controller.js.map