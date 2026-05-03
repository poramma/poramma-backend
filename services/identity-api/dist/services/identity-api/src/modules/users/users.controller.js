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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = getUser;
exports.getUserProfile = getUserProfile;
exports.updateUserStatus = updateUserStatus;
exports.updatePersonalInfo = updatePersonalInfo;
exports.updateAddress = updateAddress;
exports.updateStudentProfile = updateStudentProfile;
exports.updateWorkerProfile = updateWorkerProfile;
const service = __importStar(require("./users.service"));
const dto_1 = require("./dto");
async function getUser(req, res) {
    try {
        const user = await service.getUserById(req.params.id);
        res.json(user);
    }
    catch (err) {
        res.status(404).json({ error: err.message });
    }
}
async function getUserProfile(req, res) {
    try {
        const userId = req.params.id || req.user?.id;
        const profile = await service.getUserProfile(userId);
        res.json(profile);
    }
    catch (err) {
        res.status(404).json({ error: err.message });
    }
}
async function updateUserStatus(req, res) {
    const parsed = dto_1.updateUserStatusDto.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
    }
    try {
        const updated = await service.updateUserStatus(req.params.id, parsed.data.status);
        res.json({ message: "Statut mis à jour avec succès", user: updated });
    }
    catch (err) {
        res.status(404).json({ error: err.message });
    }
}
async function updatePersonalInfo(req, res) {
    const parsed = dto_1.updatePersonalInfoDto.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ errors: parsed.error.flatten() });
    const result = await service.updatePersonalInfo(req.params.id, parsed.data);
    res.json(result);
}
async function updateAddress(req, res) {
    const parsed = dto_1.updateAddressDto.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ errors: parsed.error.flatten() });
    const result = await service.updateAddress(req.params.id, parsed.data);
    res.json(result);
}
async function updateStudentProfile(req, res) {
    const parsed = dto_1.updateStudentProfileDto.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ errors: parsed.error.flatten() });
    const result = await service.updateStudentProfile(req.params.id, parsed.data);
    res.json(result);
}
async function updateWorkerProfile(req, res) {
    const parsed = dto_1.updateWorkerProfileDto.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ errors: parsed.error.flatten() });
    const result = await service.updateWorkerProfile(req.params.id, parsed.data);
    res.json(result);
}
//# sourceMappingURL=users.controller.js.map