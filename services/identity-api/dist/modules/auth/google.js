"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleClientIds = googleClientIds;
exports.isGoogleConfigured = isGoogleConfigured;
exports.resetGoogleKeyCache = resetGoogleKeyCache;
exports.verifyGoogleIdToken = verifyGoogleIdToken;
const crypto_1 = require("crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const utils_1 = require("@poramma/utils");
const DEFAULT_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const MAX_TOKEN_AGE_SECONDS = 10 * 60;
const MIN_REFETCH_MS = 60_000;
function googleClientIds() {
    return (process.env.GOOGLE_CLIENT_ID ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
}
function isGoogleConfigured() {
    return googleClientIds().length > 0;
}
let keys = new Map();
let keysExpireAt = 0;
let lastFetchAt = 0;
let inflight = null;
async function refreshKeys() {
    if (inflight)
        return inflight;
    if (Date.now() - lastFetchAt < MIN_REFETCH_MS && keys.size > 0)
        return;
    inflight = (async () => {
        lastFetchAt = Date.now();
        const res = await fetch(process.env.GOOGLE_JWKS_URL || DEFAULT_JWKS_URL, { signal: AbortSignal.timeout(5000) });
        if (!res.ok)
            throw new Error(`JWKS HTTP ${res.status}`);
        const body = (await res.json());
        const next = new Map();
        for (const jwk of body.keys ?? []) {
            if (jwk.kid && jwk.kty === "RSA")
                next.set(jwk.kid, (0, crypto_1.createPublicKey)({ key: jwk, format: "jwk" }));
        }
        if (next.size === 0)
            throw new Error("JWKS vide");
        keys = next;
        const maxAge = /max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1];
        keysExpireAt = Date.now() + (maxAge ? Number(maxAge) * 1000 : 60 * 60 * 1000);
    })().finally(() => {
        inflight = null;
    });
    return inflight;
}
async function keyFor(kid) {
    if (Date.now() >= keysExpireAt || !keys.has(kid))
        await refreshKeys();
    return keys.get(kid);
}
function resetGoogleKeyCache() {
    keys = new Map();
    keysExpireAt = 0;
    lastFetchAt = 0;
}
const invalid = () => new utils_1.UnauthorizedError("Connexion Google refusée : jeton invalide ou expiré. Réessayez.");
async function verifyGoogleIdToken(idToken) {
    const audiences = googleClientIds();
    if (audiences.length === 0) {
        throw new utils_1.AppError(503, "SERVICE_UNAVAILABLE", "La connexion avec Google n'est pas disponible pour le moment.");
    }
    if (typeof idToken !== "string" || idToken.length < 20 || idToken.length > 4096)
        throw invalid();
    const decoded = jsonwebtoken_1.default.decode(idToken, { complete: true });
    const header = decoded && typeof decoded !== "string" ? decoded.header : null;
    if (!header || header.alg !== "RS256" || !header.kid)
        throw invalid();
    let key;
    try {
        key = await keyFor(header.kid);
    }
    catch {
        throw new utils_1.AppError(503, "SERVICE_UNAVAILABLE", "La connexion avec Google est momentanément indisponible. Réessayez dans un instant.");
    }
    if (!key)
        throw invalid();
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(idToken, key, {
            algorithms: ["RS256"],
            audience: audiences,
            issuer: ISSUERS,
            clockTolerance: 30,
        });
    }
    catch {
        throw invalid();
    }
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.iat !== "number" || now - payload.iat > MAX_TOKEN_AGE_SECONDS)
        throw invalid();
    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const verified = payload.email_verified === true || payload.email_verified === "true";
    if (!payload.sub || !email || !verified) {
        throw new utils_1.UnauthorizedError("Votre adresse email Google n'est pas vérifiée : impossible de l'utiliser pour vous connecter.");
    }
    return {
        sub: String(payload.sub),
        email,
        firstName: typeof payload.given_name === "string" ? payload.given_name.trim().slice(0, 255) || null : null,
        lastName: typeof payload.family_name === "string" ? payload.family_name.trim().slice(0, 255) || null : null,
        picture: typeof payload.picture === "string" ? payload.picture : null,
    };
}
//# sourceMappingURL=google.js.map