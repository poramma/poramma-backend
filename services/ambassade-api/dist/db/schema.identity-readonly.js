"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identityStudentScholarships = exports.identityStudentProfiles = exports.identityAgents = exports.identityUserProfiles = exports.identityUsers = exports.identity = void 0;
exports.getAgentUserId = getAgentUserId;
exports.resolveTargetUserIds = resolveTargetUserIds;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_orm_2 = require("drizzle-orm");
const connection_1 = require("./connection");
const utils_1 = require("@poramma/utils");
const ambassade_core_1 = require("@poramma/ambassade-core");
exports.identity = ambassade_core_1.identitySchema.identity;
exports.identityUsers = ambassade_core_1.identitySchema.identityUsers;
exports.identityUserProfiles = ambassade_core_1.identitySchema.identityUserProfiles;
exports.identityAgents = exports.identity.table("agents", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    matricule: (0, pg_core_1.varchar)("matricule", { length: 50 }),
    roleTitle: (0, pg_core_1.varchar)("role_title", { length: 255 }),
    department: (0, pg_core_1.varchar)("department", { length: 30 }),
    officeNumber: (0, pg_core_1.varchar)("office_number", { length: 50 }),
    active: (0, pg_core_1.boolean)("active"),
});
async function getAgentUserId(agentId) {
    const [row] = await connection_1.db.select({ userId: exports.identityAgents.userId }).from(exports.identityAgents).where((0, drizzle_orm_2.eq)(exports.identityAgents.id, agentId));
    if (!row)
        throw new utils_1.NotFoundError("Agent introuvable");
    return row.userId;
}
exports.identityStudentProfiles = exports.identity.table("student_profiles", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    userId: (0, pg_core_1.uuid)("user_id").notNull(),
    university: (0, pg_core_1.varchar)("university", { length: 255 }),
    faculty: (0, pg_core_1.varchar)("faculty", { length: 255 }),
    studyLevel: (0, pg_core_1.varchar)("study_level", { length: 100 }),
});
exports.identityStudentScholarships = exports.identity.table("student_scholarships", {
    id: (0, pg_core_1.uuid)("id").primaryKey(),
    studentProfileId: (0, pg_core_1.uuid)("student_profile_id").notNull(),
    isRecipient: (0, pg_core_1.boolean)("is_recipient"),
    decisionNumber: (0, pg_core_1.varchar)("decision_number", { length: 100 }),
    promotion: (0, pg_core_1.varchar)("promotion", { length: 100 }),
});
async function resolveTargetUserIds(filters) {
    if (filters.userIds && filters.userIds.length > 0)
        return filters.userIds;
    const users = await connection_1.db
        .select({
        userId: exports.identityUsers.id,
        status: exports.identityUsers.status,
        city: exports.identityUserProfiles.city,
        userType: exports.identityUserProfiles.userType,
    })
        .from(exports.identityUsers)
        .innerJoin(exports.identityUserProfiles, (0, drizzle_orm_2.eq)(exports.identityUserProfiles.userId, exports.identityUsers.id))
        .where((0, drizzle_orm_2.eq)(exports.identityUserProfiles.userType, "student"));
    let candidates = users;
    if (filters.statuses?.length)
        candidates = candidates.filter((u) => filters.statuses.includes(u.status ?? ""));
    if (filters.cities?.length)
        candidates = candidates.filter((u) => filters.cities.includes(u.city ?? ""));
    if (filters.studyLevels?.length || filters.faculties?.length || filters.universities?.length || filters.hasBourse !== undefined) {
        const ids = candidates.map((u) => u.userId);
        if (ids.length === 0)
            return [];
        const profiles = await connection_1.db.select().from(exports.identityStudentProfiles).where((0, drizzle_orm_1.inArray)(exports.identityStudentProfiles.userId, ids));
        const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
        let scholarshipByProfileId = new Map();
        if (filters.hasBourse !== undefined) {
            const profileIds = profiles.map((p) => p.id);
            const scholarships = profileIds.length
                ? await connection_1.db.select().from(exports.identityStudentScholarships).where((0, drizzle_orm_1.inArray)(exports.identityStudentScholarships.studentProfileId, profileIds))
                : [];
            scholarshipByProfileId = new Map(scholarships.map((s) => [s.studentProfileId, !!s.isRecipient]));
        }
        candidates = candidates.filter((u) => {
            const profile = profileByUser.get(u.userId);
            if (filters.studyLevels?.length && !filters.studyLevels.includes(profile?.studyLevel ?? ""))
                return false;
            if (filters.faculties?.length && !filters.faculties.includes(profile?.faculty ?? ""))
                return false;
            if (filters.universities?.length && !filters.universities.includes(profile?.university ?? ""))
                return false;
            if (filters.hasBourse !== undefined) {
                const isRecipient = profile ? scholarshipByProfileId.get(profile.id) ?? false : false;
                if (isRecipient !== filters.hasBourse)
                    return false;
            }
            return true;
        });
    }
    return candidates.map((u) => u.userId);
}
//# sourceMappingURL=schema.identity-readonly.js.map