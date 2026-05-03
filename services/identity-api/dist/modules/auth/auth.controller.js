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
exports.register = register;
exports.verifyOtp = verifyOtp;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.me = me;
exports.updateProfile = updateProfile;
const dto_1 = require("./dto");
const authService = __importStar(require("./auth.service"));
async function register(req, res) {
    const parsed = dto_1.registerDto.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
    }
    try {
        const user = await authService.register(parsed.data.email, parsed.data.password, parsed.data.firstName, parsed.data.lastName);
        res.status(201).json({ message: "Inscription réussie. OTP envoyé.", user });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
}
async function verifyOtp(req, res) {
    const parsed = dto_1.verifyOtpDto.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
    }
    try {
        await authService.verifyOtp(parsed.data.email, parsed.data.otp);
        res.status(200).json({ message: "Compte vérifié avec succès." });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
}
async function login(req, res) {
    const parsed = dto_1.loginDto.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
    }
    try {
        const tokens = await authService.login(parsed.data.email, parsed.data.password);
        res.status(200).json(tokens);
    }
    catch (err) {
        res.status(401).json({ error: err.message });
    }
}
async function refresh(req, res) {
    const parsed = dto_1.refreshDto.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
    }
    try {
        const newAccessToken = await authService.refresh(parsed.data.refreshToken);
        res.status(200).json(newAccessToken);
    }
    catch (err) {
        res.status(401).json({ error: err.message });
    }
}
async function logout(req, res) {
    try {
        const userId = req.userId;
        await authService.logout(userId);
        res.status(200).json({ message: "Déconnexion réussie." });
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
}
async function me(req, res) {
    try {
        const userId = req.userId;
        const user = await authService.getProfile(userId);
        res.status(200).json(user);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
}
async function updateProfile(req, res) {
    const parsed = dto_1.updateProfileDto.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
    }
    try {
        const userId = req.userId;
        const updated = await authService.updateProfile(userId, parsed.data);
        res.status(200).json(updated);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
}
//# sourceMappingURL=auth.controller.js.map