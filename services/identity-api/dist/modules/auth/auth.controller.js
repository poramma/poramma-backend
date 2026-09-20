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
exports.register = register;
exports.sendOtp = sendOtp;
exports.verifyOtp = verifyOtp;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.me = me;
exports.updateProfile = updateProfile;
exports.getRoles = getRoles;
exports.getPermissions = getPermissions;
exports.switchRole = switchRole;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const dto_1 = require("./dto");
const authService = __importStar(require("./auth.service"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = require("crypto");
const mailer_1 = require("@poramma/mailer");
const dto_2 = require("@poramma/dto");
const utils_1 = require("@poramma/utils");
const cache_1 = require("@poramma/cache");
function zodDetails(error) {
    return error.flatten().fieldErrors;
}
const LOGIN_RATE_LIMIT = 10;
const LOGIN_RATE_WINDOW_SECONDS = 15 * 60;
const OTP_RATE_LIMIT = 5;
const OTP_RATE_WINDOW_SECONDS = 15 * 60;
async function enforceRateLimit(key, limit, windowSeconds) {
    const { allowed } = await (0, cache_1.checkRateLimit)(key, limit, windowSeconds);
    if (!allowed)
        throw new utils_1.RateLimitError("Trop de tentatives. Veuillez réessayer plus tard.");
}
async function register(req, res) {
    const parsed = dto_1.registerDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const user = await authService.register(parsed.data.email, parsed.data.password, parsed.data.firstName, parsed.data.lastName);
    res.status(201).json((0, dto_2.ok)(user, undefined, "Inscription réussie. OTP envoyé."));
}
async function sendOtp(req, res) {
    const { emailOrPhone } = req.body;
    if (!emailOrPhone)
        throw new utils_1.ValidationError("Email requis", { emailOrPhone: ["Champ requis"] });
    await enforceRateLimit(`otp:${emailOrPhone}`, OTP_RATE_LIMIT, OTP_RATE_WINDOW_SECONDS);
    const otp = (0, crypto_1.randomInt)(100000, 1000000).toString();
    const codeHash = await bcryptjs_1.default.hash(otp, 10);
    const userExists = await authService.checkUser(emailOrPhone);
    if (userExists)
        throw new utils_1.ConflictError("Email déjà utilisé");
    await authService.saveOpt(emailOrPhone, codeHash);
    try {
        await (0, mailer_1.sendMail)({
            to: emailOrPhone,
            subject: "Votre code de vérification Poramma",
            html: (0, mailer_1.renderEmail)({
                title: "Votre code de vérification",
                paragraphs: ["Bienvenue sur Poramma ! Saisissez ce code pour créer votre compte :"],
                rawHtml: `<p style="margin:8px 0 18px;font-size:34px;letter-spacing:8px;font-weight:700;color:#00572c;">${otp}</p>`,
                footer: "Ce code est valable 5 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
            }),
        });
    }
    catch (err) {
        console.error("[auth] envoi du code OTP échoué :", err.message);
        throw new utils_1.ValidationError("Le code n'a pas pu être envoyé. Vérifiez l'adresse email puis réessayez.", {
            emailOrPhone: ["Envoi impossible"],
        });
    }
    res.json((0, dto_2.ok)(null, undefined, "OTP envoyé avec succès"));
}
async function verifyOtp(req, res) {
    const parsed = dto_1.verifyOtpDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const result = await authService.verifyOtp(parsed.data.email, parsed.data.otp, parsed.data.password, parsed.data.firstName, parsed.data.lastName, parsed.data.phone);
    res.status(201).json((0, dto_2.ok)(result, undefined, "Compte créé avec succès."));
}
async function login(req, res) {
    const parsed = dto_1.loginDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    await enforceRateLimit(`login:${req.ip}`, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_SECONDS);
    const ua = req.headers["user-agent"];
    const tokens = await authService.login(parsed.data.email, parsed.data.password, req.ip, typeof ua === "string" ? ua : null, parsed.data.rememberMe ?? false);
    res.json((0, dto_2.ok)(tokens));
}
async function refresh(req, res) {
    const parsed = dto_1.refreshDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const tokens = await authService.refresh(parsed.data.refreshToken);
    res.json((0, dto_2.ok)(tokens));
}
async function logout(req, res) {
    const userId = req.userId;
    const sessionId = req.sessionId;
    await authService.logout(userId, sessionId);
    res.json((0, dto_2.ok)(null, undefined, "Déconnexion réussie."));
}
async function me(req, res) {
    const userId = req.userId;
    const user = await authService.getProfile(userId);
    res.json((0, dto_2.ok)(user));
}
async function updateProfile(req, res) {
    const parsed = dto_1.updateProfileDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const userId = req.userId;
    const updated = await authService.updateProfile(userId, parsed.data);
    res.json((0, dto_2.ok)(updated));
}
async function getRoles(_req, res) {
    const roles = await authService.listSystemRoles();
    res.json((0, dto_2.ok)(roles));
}
async function getPermissions(req, res) {
    const userId = req.userId;
    const codes = await authService.getMyPermissions(userId);
    res.json((0, dto_2.ok)(codes));
}
async function switchRole(req, res) {
    const parsed = dto_1.switchRoleDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const userId = req.userId;
    const sessionId = req.sessionId;
    const result = await authService.switchRole(userId, sessionId, parsed.data.roleId);
    res.json((0, dto_2.ok)(result));
}
const FORGOT_RATE_LIMIT = 5;
const FORGOT_RATE_WINDOW_SECONDS = 15 * 60;
const RESET_RATE_LIMIT = 5;
async function forgotPassword(req, res) {
    const parsed = dto_1.forgotPasswordDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Adresse email invalide", zodDetails(parsed.error));
    const email = parsed.data.email.trim();
    await enforceRateLimit(`forgot-ip:${req.ip}`, FORGOT_RATE_LIMIT * 4, FORGOT_RATE_WINDOW_SECONDS);
    await enforceRateLimit(`forgot:${email.toLowerCase()}`, FORGOT_RATE_LIMIT, FORGOT_RATE_WINDOW_SECONDS);
    const reset = await authService.createPasswordResetCode(email);
    if (reset) {
        try {
            await (0, mailer_1.sendMail)({
                to: reset.email,
                subject: "Réinitialisation de votre mot de passe Poramma",
                html: (0, mailer_1.renderEmail)({
                    title: "Réinitialisation du mot de passe",
                    paragraphs: [
                        `${reset.firstName ? `Bonjour ${reset.firstName}, v` : "V"}ous avez demandé à réinitialiser votre mot de passe. Saisissez ce code sur la page « Mot de passe oublié » :`,
                    ],
                    rawHtml: `<p style="margin:8px 0 18px;font-size:34px;letter-spacing:8px;font-weight:700;color:#00572c;">${reset.code}</p>`,
                    footer: "Ce code est valable 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.",
                }),
            });
        }
        catch (err) {
            console.error("[auth] envoi du code de réinitialisation échoué :", err.message);
        }
    }
    res.json((0, dto_2.ok)(null, undefined, "Si un compte existe pour cette adresse, un code de réinitialisation vient d'être envoyé."));
}
async function resetPassword(req, res) {
    const parsed = dto_1.resetPasswordDto.safeParse(req.body);
    if (!parsed.success)
        throw new utils_1.ValidationError("Données invalides", zodDetails(parsed.error));
    const { email, otp, newPassword } = parsed.data;
    await enforceRateLimit(`reset:${email.toLowerCase()}`, RESET_RATE_LIMIT, FORGOT_RATE_WINDOW_SECONDS);
    await enforceRateLimit(`reset-ip:${req.ip}`, RESET_RATE_LIMIT * 4, FORGOT_RATE_WINDOW_SECONDS);
    const done = await authService.resetPasswordWithCode({ email, code: otp, newPassword, ip: req.ip ?? null, ua: req.headers["user-agent"] ?? null });
    try {
        await (0, mailer_1.sendMail)({
            to: done.email,
            subject: "Votre mot de passe Poramma a été modifié",
            html: (0, mailer_1.renderEmail)({
                title: "Mot de passe modifié",
                paragraphs: [
                    "Le mot de passe de votre compte vient d'être modifié et toutes vos sessions ont été déconnectées.",
                    "Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement l'ambassade.",
                ],
            }),
        });
    }
    catch (err) {
        console.error("[auth] email de confirmation de réinitialisation échoué :", err.message);
    }
    res.json((0, dto_2.ok)(null, undefined, "Votre mot de passe a été modifié. Vous pouvez vous connecter."));
}
//# sourceMappingURL=auth.controller.js.map