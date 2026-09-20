"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureEtudiantRecord = ensureEtudiantRecord;
exports.getRegistrationStatus = getRegistrationStatus;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const etudiants_1 = require("../schema/etudiants");
const audit_1 = require("./audit");
function newId() {
    return `etu-${crypto_1.default.randomUUID()}`;
}
async function ensureEtudiantRecord(db, userId) {
    const [existing] = await db.select().from(etudiants_1.etudiants).where((0, drizzle_orm_1.eq)(etudiants_1.etudiants.userId, userId));
    if (existing)
        return existing;
    const inserted = await db
        .insert(etudiants_1.etudiants)
        .values({ id: newId(), userId, status: "PENDING" })
        .onConflictDoNothing()
        .returning();
    if (inserted.length > 0) {
        await (0, audit_1.writeAudit)(db, {
            action: "INSCRIPTION",
            entityType: "ETUDIANT",
            entityId: inserted[0].id,
            actor: null,
            details: { userId },
        });
        return inserted[0];
    }
    const [row] = await db.select().from(etudiants_1.etudiants).where((0, drizzle_orm_1.eq)(etudiants_1.etudiants.userId, userId));
    return row;
}
async function getRegistrationStatus(db, userId) {
    const tracking = await ensureEtudiantRecord(db, userId);
    return {
        status: tracking.status,
        isValidated: tracking.status === "VALIDATED",
        submittedAt: tracking.submittedAt,
        inue: tracking.inue,
        inueAssignedAt: tracking.inueAssignedAt,
        reviewNote: tracking.reviewNote,
        reviewedAt: tracking.reviewedAt,
    };
}
//# sourceMappingURL=etudiants.js.map