"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.etudiantsSource = exports.RemoteEtudiantsSource = exports.LocalDbEtudiantsSource = void 0;
exports.createEtudiantsSource = createEtudiantsSource;
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../db/connection");
const schema_identity_readonly_1 = require("../../db/schema.identity-readonly");
function toRaw(row) {
    return {
        userId: row.id,
        email: row.email,
        phone: row.phone,
        accountStatus: row.status,
        registeredAt: row.createdAt,
        inue: row.inue,
        firstName: row.firstName,
        lastName: row.lastName,
        nationality: row.nationality,
        city: row.city,
        country: row.country,
        university: row.university ?? null,
        faculty: row.faculty ?? null,
        studyLevel: row.studyLevel ?? null,
        hasBourse: row.hasBourse ?? false,
        scholarshipDecisionNumber: row.scholarshipDecisionNumber ?? null,
        scholarshipPromotion: row.scholarshipPromotion ?? null,
    };
}
async function fetchAcademicData(userIds) {
    if (userIds.length === 0)
        return new Map();
    const profiles = await connection_1.db.select().from(schema_identity_readonly_1.identityStudentProfiles).where((0, drizzle_orm_1.inArray)(schema_identity_readonly_1.identityStudentProfiles.userId, userIds));
    const profileIds = profiles.map((p) => p.id);
    const scholarships = profileIds.length
        ? await connection_1.db.select().from(schema_identity_readonly_1.identityStudentScholarships).where((0, drizzle_orm_1.inArray)(schema_identity_readonly_1.identityStudentScholarships.studentProfileId, profileIds))
        : [];
    const scholarshipByProfileId = new Map(scholarships.map((s) => [s.studentProfileId, s]));
    const byUserId = new Map();
    for (const p of profiles) {
        const scholarship = scholarshipByProfileId.get(p.id);
        byUserId.set(p.userId, {
            university: p.university,
            faculty: p.faculty,
            studyLevel: p.studyLevel,
            hasBourse: !!scholarship?.isRecipient,
            scholarshipDecisionNumber: scholarship?.decisionNumber ?? null,
            scholarshipPromotion: scholarship?.promotion ?? null,
        });
    }
    return byUserId;
}
class LocalDbEtudiantsSource {
    async findByUserId(userId) {
        const [row] = await connection_1.db
            .select({
            id: schema_identity_readonly_1.identityUsers.id,
            email: schema_identity_readonly_1.identityUsers.email,
            phone: schema_identity_readonly_1.identityUsers.phone,
            status: schema_identity_readonly_1.identityUsers.status,
            createdAt: schema_identity_readonly_1.identityUsers.createdAt,
            inue: schema_identity_readonly_1.identityUserProfiles.inue,
            firstName: schema_identity_readonly_1.identityUserProfiles.firstName,
            lastName: schema_identity_readonly_1.identityUserProfiles.lastName,
            nationality: schema_identity_readonly_1.identityUserProfiles.nationality,
            city: schema_identity_readonly_1.identityUserProfiles.city,
            country: schema_identity_readonly_1.identityUserProfiles.country,
        })
            .from(schema_identity_readonly_1.identityUsers)
            .innerJoin(schema_identity_readonly_1.identityUserProfiles, (0, drizzle_orm_1.eq)(schema_identity_readonly_1.identityUserProfiles.userId, schema_identity_readonly_1.identityUsers.id))
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_identity_readonly_1.identityUsers.id, userId), (0, drizzle_orm_1.eq)(schema_identity_readonly_1.identityUserProfiles.userType, "student")));
        if (!row)
            return null;
        const academic = await fetchAcademicData([userId]);
        return toRaw({ ...row, ...academic.get(userId) });
    }
    async list(filters) {
        const conditions = [(0, drizzle_orm_1.eq)(schema_identity_readonly_1.identityUserProfiles.userType, "student")];
        if (filters.userIds?.length)
            conditions.push((0, drizzle_orm_1.inArray)(schema_identity_readonly_1.identityUsers.id, filters.userIds));
        if (filters.city)
            conditions.push((0, drizzle_orm_1.eq)(schema_identity_readonly_1.identityUserProfiles.city, filters.city));
        if (filters.search) {
            const s = `%${filters.search}%`;
            conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_identity_readonly_1.identityUserProfiles.firstName, s), (0, drizzle_orm_1.ilike)(schema_identity_readonly_1.identityUserProfiles.lastName, s), (0, drizzle_orm_1.ilike)(schema_identity_readonly_1.identityUsers.email, s), (0, drizzle_orm_1.ilike)(schema_identity_readonly_1.identityUserProfiles.inue, s)));
        }
        const rows = await connection_1.db
            .select({
            id: schema_identity_readonly_1.identityUsers.id,
            email: schema_identity_readonly_1.identityUsers.email,
            phone: schema_identity_readonly_1.identityUsers.phone,
            status: schema_identity_readonly_1.identityUsers.status,
            createdAt: schema_identity_readonly_1.identityUsers.createdAt,
            inue: schema_identity_readonly_1.identityUserProfiles.inue,
            firstName: schema_identity_readonly_1.identityUserProfiles.firstName,
            lastName: schema_identity_readonly_1.identityUserProfiles.lastName,
            nationality: schema_identity_readonly_1.identityUserProfiles.nationality,
            city: schema_identity_readonly_1.identityUserProfiles.city,
            country: schema_identity_readonly_1.identityUserProfiles.country,
        })
            .from(schema_identity_readonly_1.identityUsers)
            .innerJoin(schema_identity_readonly_1.identityUserProfiles, (0, drizzle_orm_1.eq)(schema_identity_readonly_1.identityUserProfiles.userId, schema_identity_readonly_1.identityUsers.id))
            .where((0, drizzle_orm_1.and)(...conditions));
        const academic = await fetchAcademicData(rows.map((r) => r.id));
        let result = rows.map((r) => toRaw({ ...r, ...academic.get(r.id) }));
        if (filters.university)
            result = result.filter((e) => e.university === filters.university);
        if (filters.faculty)
            result = result.filter((e) => e.faculty === filters.faculty);
        if (filters.studyLevel)
            result = result.filter((e) => e.studyLevel === filters.studyLevel);
        if (filters.hasBourse !== undefined)
            result = result.filter((e) => e.hasBourse === filters.hasBourse);
        return result;
    }
    async search(query) {
        return this.list({ search: query });
    }
}
exports.LocalDbEtudiantsSource = LocalDbEtudiantsSource;
class RemoteEtudiantsSource {
    async findByUserId(_userId) {
        throw new Error("RemoteEtudiantsSource n'est pas encore implémenté — plateforme tierce non disponible.");
    }
    async list(_filters) {
        throw new Error("RemoteEtudiantsSource n'est pas encore implémenté — plateforme tierce non disponible.");
    }
    async search(_query) {
        throw new Error("RemoteEtudiantsSource n'est pas encore implémenté — plateforme tierce non disponible.");
    }
}
exports.RemoteEtudiantsSource = RemoteEtudiantsSource;
function createEtudiantsSource() {
    return process.env.ETUDIANTS_SOURCE === "remote" ? new RemoteEtudiantsSource() : new LocalDbEtudiantsSource();
}
exports.etudiantsSource = createEtudiantsSource();
//# sourceMappingURL=etudiants-source.js.map