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
exports.apiErrorSchema = exports.paginationMetaSchema = exports.communityCampagnesDto = exports.communityRendezVousDto = exports.communityDemandesDto = exports.communityDocumentsDto = exports.communityServicesDto = void 0;
exports.apiResponseSchema = apiResponseSchema;
exports.ok = ok;
exports.fail = fail;
exports.paginationMeta = paginationMeta;
const zod_1 = require("zod");
exports.communityServicesDto = __importStar(require("./community/services"));
exports.communityDocumentsDto = __importStar(require("./community/documents"));
exports.communityDemandesDto = __importStar(require("./community/demandes"));
exports.communityRendezVousDto = __importStar(require("./community/rendezvous"));
exports.communityCampagnesDto = __importStar(require("./community/campagnes"));
exports.paginationMetaSchema = zod_1.z.object({
    page: zod_1.z.number().int(),
    limit: zod_1.z.number().int(),
    total: zod_1.z.number().int(),
    totalPages: zod_1.z.number().int(),
    hasNext: zod_1.z.boolean(),
    hasPrev: zod_1.z.boolean(),
});
function apiResponseSchema(dataSchema) {
    return zod_1.z.object({
        success: zod_1.z.boolean(),
        data: dataSchema,
        message: zod_1.z.string().nullable(),
        meta: exports.paginationMetaSchema.optional(),
    });
}
exports.apiErrorSchema = zod_1.z.object({
    code: zod_1.z.string(),
    message: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.array(zod_1.z.string())).nullable(),
    timestamp: zod_1.z.string(),
});
function ok(data, meta, message = null) {
    const response = { success: true, data, message };
    if (meta)
        response.meta = meta;
    return response;
}
function fail(code, message, details = null) {
    return { code, message, details, timestamp: new Date().toISOString() };
}
function paginationMeta(page, limit, total) {
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    return {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}
//# sourceMappingURL=index.js.map