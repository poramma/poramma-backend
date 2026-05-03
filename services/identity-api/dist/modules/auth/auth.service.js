"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.verifyOtp = verifyOtp;
exports.login = login;
exports.refresh = refresh;
exports.logout = logout;
exports.getProfile = getProfile;
exports.updateProfile = updateProfile;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const connection_1 = require("../../db/connection");
const schema_identity_1 = require("../../db/schema.identity");
const drizzle_orm_1 = require("drizzle-orm");
const crypto_1 = require("crypto");
const date_fns_1 = require("date-fns");
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const REFRESH_EXPIRATION = "30d";
async function register(email, password, firstName, lastName) {
    const existing = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.email, email));
    if (existing.length > 0)
        throw new Error("Email déjà utilisé");
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const [user] = await connection_1.db
        .insert(schema_identity_1.users)
        .values({ email, passwordHash, firstName, lastName })
        .returning();
    const otpCode = (0, crypto_1.randomInt)(100000, 999999).toString();
    const otpHash = await bcryptjs_1.default.hash(otpCode, 10);
    await connection_1.db.insert(schema_identity_1.otps).values({
        userId: user.id,
        codeHash: otpHash,
        channel: "email",
        purpose: "signup",
        expiresAt: (0, date_fns_1.addMinutes)(new Date(), 10),
    });
    console.log(`OTP pour ${email}: ${otpCode}`);
    return user;
}
async function verifyOtp(email, otp) {
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.email, email));
    if (!user)
        throw new Error("Utilisateur introuvable");
    const [otpRecord] = await connection_1.db
        .select()
        .from(schema_identity_1.otps)
        .where((0, drizzle_orm_1.eq)(schema_identity_1.otps.userId, user.id));
    if (!otpRecord)
        throw new Error("OTP introuvable");
    if (otpRecord.consumedAt)
        throw new Error("OTP déjà utilisé");
    if (new Date() > otpRecord.expiresAt)
        throw new Error("OTP expiré");
    const valid = await bcryptjs_1.default.compare(otp, otpRecord.codeHash);
    if (!valid)
        throw new Error("OTP invalide");
    await connection_1.db
        .update(schema_identity_1.users)
        .set({ emailVerified: true, status: "PENDING" })
        .where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, user.id));
    await connection_1.db.update(schema_identity_1.otps).set({ consumedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.otps.id, otpRecord.id));
    return { success: true };
}
async function login(email, password) {
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.email, email));
    if (!user)
        throw new Error("Identifiants invalides");
    const match = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!match)
        throw new Error("Identifiants invalides");
    const accessToken = jsonwebtoken_1.default.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jsonwebtoken_1.default.sign({ sub: user.id }, JWT_SECRET, { expiresIn: REFRESH_EXPIRATION });
    const refreshHash = await bcryptjs_1.default.hash(refreshToken, 10);
    await connection_1.db.insert(schema_identity_1.sessions).values({
        userId: user.id,
        refreshTokenHash: refreshHash,
        ip: "0.0.0.0",
        userAgent: "unknown",
    });
    return { accessToken, refreshToken };
}
async function refresh(refreshToken) {
    try {
        const decoded = jsonwebtoken_1.default.verify(refreshToken, JWT_SECRET);
        const userId = decoded.sub;
        const newAccessToken = jsonwebtoken_1.default.sign({ sub: userId }, JWT_SECRET, { expiresIn: "15m" });
        return { accessToken: newAccessToken };
    }
    catch {
        throw new Error("Token invalide");
    }
}
async function logout(userId) {
    await connection_1.db.update(schema_identity_1.sessions).set({ revokedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.sessions.userId, userId));
}
async function getProfile(userId) {
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId));
    return user;
}
async function updateProfile(userId, data) {
    const [user] = await connection_1.db
        .update(schema_identity_1.users)
        .set({
        ...data,
        updatedAt: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId))
        .returning();
    return user;
}
//# sourceMappingURL=auth.service.js.map