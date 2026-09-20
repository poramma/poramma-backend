"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireValidatedProfile = requireValidatedProfile;
exports.rateLimit = rateLimit;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const utils_1 = require("@poramma/utils");
const cache_1 = require("@poramma/cache");
const ambassade_core_1 = require("@poramma/ambassade-core");
const connection_1 = require("../db/connection");
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            throw new utils_1.UnauthorizedError("Non authentifié");
        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        }
        catch {
            throw new utils_1.UnauthorizedError("Token invalide ou expiré");
        }
        if (!(await (0, cache_1.isSessionActive)(decoded.sessionId))) {
            throw new utils_1.UnauthorizedError("Session révoquée");
        }
        req.userId = decoded.sub;
        req.roleLevel = decoded.roleLevel ?? 999;
        req.sessionId = decoded.sessionId;
        next();
    }
    catch (err) {
        next(err);
    }
}
async function requireValidatedProfile(req, res, next) {
    try {
        const userId = req.userId;
        const status = await ambassade_core_1.etudiantsLogic.getRegistrationStatus(connection_1.db, userId);
        if (!status.isValidated) {
            throw new utils_1.ForbiddenError("Vous devez d'abord vous enregistrer auprès de l'ambassade et voir votre dossier validé pour accéder à cette fonctionnalité.");
        }
        next();
    }
    catch (err) {
        next(err);
    }
}
function rateLimit(name, limit, windowSeconds) {
    return async (req, _res, next) => {
        try {
            const key = `community:${name}:${req.userId ?? req.ip}`;
            const { allowed } = await (0, cache_1.checkRateLimit)(key, limit, windowSeconds);
            if (!allowed)
                throw new utils_1.RateLimitError("Trop de requêtes. Veuillez réessayer plus tard.");
            next();
        }
        catch (err) {
            next(err);
        }
    };
}
//# sourceMappingURL=middleware.js.map