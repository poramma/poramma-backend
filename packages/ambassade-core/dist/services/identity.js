"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActorName = getActorName;
exports.getUser = getUser;
exports.getUsersByIds = getUsersByIds;
const drizzle_orm_1 = require("drizzle-orm");
const identity_1 = require("../schema/identity");
const etudiants_1 = require("../schema/etudiants");
async function getActorName(db, userId) {
    const [profile] = await db
        .select({ firstName: identity_1.identityUserProfiles.firstName, lastName: identity_1.identityUserProfiles.lastName })
        .from(identity_1.identityUserProfiles)
        .where((0, drizzle_orm_1.eq)(identity_1.identityUserProfiles.userId, userId));
    if (!profile)
        return "Utilisateur";
    return [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Utilisateur";
}
function withInue(profile, inue) {
    if (!profile)
        return null;
    return { ...profile, inue: inue ?? profile.inue ?? null };
}
async function getUser(db, userId) {
    const [user] = await db.select().from(identity_1.identityUsers).where((0, drizzle_orm_1.eq)(identity_1.identityUsers.id, userId));
    if (!user)
        return null;
    const [profile] = await db.select().from(identity_1.identityUserProfiles).where((0, drizzle_orm_1.eq)(identity_1.identityUserProfiles.userId, userId));
    const [tracking] = await db.select({ inue: etudiants_1.etudiants.inue }).from(etudiants_1.etudiants).where((0, drizzle_orm_1.eq)(etudiants_1.etudiants.userId, userId));
    return { ...user, profile: withInue(profile, tracking?.inue) };
}
async function getUsersByIds(db, userIds) {
    const ids = [...new Set(userIds)];
    const result = new Map();
    if (!ids.length)
        return result;
    const [users, profiles, trackings] = await Promise.all([
        db.select().from(identity_1.identityUsers).where((0, drizzle_orm_1.inArray)(identity_1.identityUsers.id, ids)),
        db.select().from(identity_1.identityUserProfiles).where((0, drizzle_orm_1.inArray)(identity_1.identityUserProfiles.userId, ids)),
        db.select({ userId: etudiants_1.etudiants.userId, inue: etudiants_1.etudiants.inue }).from(etudiants_1.etudiants).where((0, drizzle_orm_1.inArray)(etudiants_1.etudiants.userId, ids)),
    ]);
    for (const user of users) {
        const profile = profiles.find((p) => p.userId === user.id);
        const tracking = trackings.find((t) => t.userId === user.id);
        result.set(user.id, { ...user, profile: withInue(profile, tracking?.inue) });
    }
    return result;
}
//# sourceMappingURL=identity.js.map