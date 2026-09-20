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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.ValidationError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.BadRequestError = exports.AppError = void 0;
exports.asyncHandler = asyncHandler;
exports.errorHandler = errorHandler;
exports.requireEnv = requireEnv;
const dto_1 = require("@poramma/dto");
function asyncHandler(fn) {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
}
class AppError extends Error {
    httpStatus;
    code;
    details;
    constructor(httpStatus, code, message, details = null) {
        super(message);
        this.name = new.target.name;
        this.httpStatus = httpStatus;
        this.code = code;
        this.details = details;
        Error.captureStackTrace?.(this, new.target);
    }
    toApiError() {
        return (0, dto_1.fail)(this.code, this.message, this.details);
    }
}
exports.AppError = AppError;
class BadRequestError extends AppError {
    constructor(message = "Requête invalide", details = null) {
        super(400, "BAD_REQUEST", message, details);
    }
}
exports.BadRequestError = BadRequestError;
class UnauthorizedError extends AppError {
    constructor(message = "Non authentifié", details = null) {
        super(401, "UNAUTHORIZED", message, details);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = "Accès refusé", details = null) {
        super(403, "FORBIDDEN", message, details);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = "Ressource introuvable", details = null) {
        super(404, "NOT_FOUND", message, details);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = "Conflit avec l’état actuel", details = null) {
        super(409, "CONFLICT", message, details);
    }
}
exports.ConflictError = ConflictError;
class ValidationError extends AppError {
    constructor(message = "Données invalides", details = null) {
        super(422, "VALIDATION_ERROR", message, details);
    }
}
exports.ValidationError = ValidationError;
class RateLimitError extends AppError {
    constructor(message = "Trop de requêtes", details = null) {
        super(429, "RATE_LIMIT_EXCEEDED", message, details);
    }
}
exports.RateLimitError = RateLimitError;
function isZodError(err) {
    return (typeof err === "object" &&
        err !== null &&
        err.name === "ZodError" &&
        Array.isArray(err.issues));
}
function zodIssuesToDetails(issues) {
    const details = {};
    for (const issue of issues) {
        const key = issue.path.length > 0 ? issue.path.join(".") : "_";
        (details[key] ??= []).push(issue.message);
    }
    return details;
}
function isBodyParseError(err) {
    return (typeof err === "object" &&
        err !== null &&
        err.type === "entity.parse.failed");
}
function toAppError(err) {
    if (err instanceof AppError)
        return err;
    if (isZodError(err)) {
        return new ValidationError("Données invalides", zodIssuesToDetails(err.issues));
    }
    if (isBodyParseError(err)) {
        return new BadRequestError("Corps de requête JSON invalide");
    }
    return new AppError(500, "INTERNAL_ERROR", "Une erreur interne est survenue");
}
function errorHandler(err, req, res, next) {
    if (res.headersSent) {
        next(err);
        return;
    }
    const appError = toAppError(err);
    if (appError.httpStatus >= 500) {
        console.error(`[${req.method} ${req.originalUrl}] Unhandled error:`, err);
    }
    else {
        console.warn(`[${req.method} ${req.originalUrl}] ${appError.httpStatus} ${appError.code}: ${appError.message}`);
    }
    res.status(appError.httpStatus).json(appError.toApiError());
}
function requireEnv(name) {
    const value = process.env[name];
    if (!value || value.trim() === "") {
        throw new Error(`Missing required environment variable ${name}. Set it in the service .env file or in docker-compose.yml.`);
    }
    return value;
}
__exportStar(require("./audit-trail"), exports);
//# sourceMappingURL=index.js.map