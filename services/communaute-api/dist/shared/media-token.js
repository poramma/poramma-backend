"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signMediaPath = signMediaPath;
exports.verifyMediaToken = verifyMediaToken;
const crypto_1 = __importDefault(require("crypto"));
const TTL_SECONDS = 6 * 3600;
function secret() {
    const s = process.env.JWT_SECRET;
    if (!s)
        throw new Error("JWT_SECRET manquant : impossible de signer les URLs de média");
    return s;
}
function mac(fileId, userId, expires) {
    return crypto_1.default.createHmac("sha256", secret()).update(`${fileId}.${userId}.${expires}`).digest("base64url");
}
function signMediaPath(fileId, userId) {
    const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
    return `/campagnes/media/${encodeURIComponent(fileId)}?u=${userId}&e=${expires}&s=${mac(fileId, userId, expires)}`;
}
function verifyMediaToken(fileId, query) {
    const userId = typeof query.u === "string" ? query.u : "";
    const expires = Number(query.e);
    const sig = typeof query.s === "string" ? query.s : "";
    if (!userId || !Number.isFinite(expires) || !sig)
        return null;
    if (expires < Math.floor(Date.now() / 1000))
        return null;
    const expected = Buffer.from(mac(fileId, userId, expires));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !crypto_1.default.timingSafeEqual(expected, given))
        return null;
    return userId;
}
//# sourceMappingURL=media-token.js.map