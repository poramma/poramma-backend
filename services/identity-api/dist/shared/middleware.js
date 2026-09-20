"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requirePermission = requirePermission;
exports.requireMinLevel = requireMinLevel;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const utils_1 = require("@poramma/utils");
const cache_1 = require("@poramma/cache");
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
        req.roleId = decoded.roleId ?? null;
        req.roleName = decoded.roleName ?? null;
        req.roleLevel = decoded.roleLevel ?? 999;
        req.permissions = decoded.permissions ?? [];
        req.sessionId = decoded.sessionId;
        next();
    }
    catch (err) {
        next(err);
    }
}
function requirePermission(code) {
    return (req, _res, next) => {
        const permissions = req.permissions || [];
        if (!permissions.includes(code)) {
            throw new utils_1.ForbiddenError("Permission insuffisante");
        }
        next();
    };
}
function requireMinLevel(minLevel) {
    return (req, _res, next) => {
        const roleLevel = req.roleLevel ?? 999;
        if (roleLevel > minLevel) {
            throw new utils_1.ForbiddenError("Niveau hiérarchique insuffisant");
        }
        next();
    };
}
function requireRole(...names) {
    return (req, _res, next) => {
        const roleName = req.roleName ?? null;
        if (!roleName || !names.includes(roleName)) {
            throw new utils_1.ForbiddenError("Rôle non autorisé");
        }
        next();
    };
}
//# sourceMappingURL=middleware.js.map