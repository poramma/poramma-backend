"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = getUserById;
exports.getUserProfile = getUserProfile;
exports.updateUserStatus = updateUserStatus;
exports.updatePersonalInfo = updatePersonalInfo;
exports.updateAddress = updateAddress;
exports.updateStudentProfile = updateStudentProfile;
exports.updateWorkerProfile = updateWorkerProfile;
const connection_1 = require("../../db/connection");
const schema_identity_1 = require("../../db/schema.identity");
const drizzle_orm_1 = require("drizzle-orm");
async function getUserById(id) {
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, id));
    if (!user)
        throw new Error("Utilisateur introuvable");
    const [profile] = await connection_1.db.select().from(schema_identity_1.userProfiles).where((0, drizzle_orm_1.eq)(schema_identity_1.userProfiles.userId, id));
    const [student] = await connection_1.db.select().from(schema_identity_1.studentProfiles).where((0, drizzle_orm_1.eq)(schema_identity_1.studentProfiles.userId, id));
    const [worker] = await connection_1.db.select().from(schema_identity_1.workerProfiles).where((0, drizzle_orm_1.eq)(schema_identity_1.workerProfiles.userId, id));
    return { ...user, profile, student, worker };
}
async function getUserProfile(userId) {
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId));
    if (!user)
        throw new Error("Utilisateur introuvable");
    const [profile] = await connection_1.db.select().from(schema_identity_1.userProfiles).where((0, drizzle_orm_1.eq)(schema_identity_1.userProfiles.userId, userId));
    const [student] = await connection_1.db.select().from(schema_identity_1.studentProfiles).where((0, drizzle_orm_1.eq)(schema_identity_1.studentProfiles.userId, userId));
    let scholarship = null;
    if (student) {
        [scholarship] = await connection_1.db.select().from(schema_identity_1.studentScholarships).where((0, drizzle_orm_1.eq)(schema_identity_1.studentScholarships.studentProfileId, student.id));
    }
    const [worker] = await connection_1.db.select().from(schema_identity_1.workerProfiles).where((0, drizzle_orm_1.eq)(schema_identity_1.workerProfiles.userId, userId));
    const documents = [];
    const logs = [];
    return {
        id: user.id,
        email: user.email,
        status: user.status,
        inue: profile?.inue,
        userType: profile?.userType,
        personalInfo: {
            firstName: profile?.firstName ?? "",
            lastName: profile?.lastName ?? "",
            phone: user?.phone ?? "",
            gender: profile?.gender ?? "",
        },
        address: {
            address: profile?.address ?? "",
            city: profile?.city ?? "",
            country: profile?.country ?? "",
            zipCode: profile?.zipCode ?? "",
        },
        studentProfile: student
            ? {
                university: student.university,
                faculty: student.faculty,
                studyLevel: student.studyLevel,
                scholarship: scholarship
                    ? {
                        isRecipient: scholarship.isRecipient,
                        decisionNumber: scholarship.decisionNumber,
                        promotion: scholarship.promotion,
                    }
                    : undefined,
            }
            : undefined,
        workerProfile: worker
            ? {
                employer: worker.employer,
                profession: worker.profession,
                contractType: worker.contractType,
            }
            : undefined,
        documents,
        logs,
    };
}
async function updateUserStatus(userId, status) {
    const [user] = await connection_1.db
        .update(schema_identity_1.users)
        .set({ status })
        .where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId))
        .returning();
    if (!user)
        throw new Error("Utilisateur introuvable");
    return user;
}
async function updatePersonalInfo(userId, data) {
    return connection_1.db.update(schema_identity_1.userProfiles).set(data).where((0, drizzle_orm_1.eq)(schema_identity_1.userProfiles.userId, userId)).returning();
}
async function updateAddress(userId, data) {
    return connection_1.db.update(schema_identity_1.userProfiles).set(data).where((0, drizzle_orm_1.eq)(schema_identity_1.userProfiles.userId, userId)).returning();
}
async function updateStudentProfile(userId, data) {
    const [student] = await connection_1.db
        .update(schema_identity_1.studentProfiles)
        .set({
        university: data.university,
        faculty: data.faculty,
        studyLevel: data.studyLevel,
    })
        .where((0, drizzle_orm_1.eq)(schema_identity_1.studentProfiles.userId, userId))
        .returning();
    if (data.scholarship) {
        await connection_1.db
            .insert(schema_identity_1.studentScholarships)
            .values({ ...data.scholarship, studentProfileId: student.id })
            .onConflictDoUpdate({ target: schema_identity_1.studentScholarships.studentProfileId, set: data.scholarship });
    }
    return student;
}
async function updateWorkerProfile(userId, data) {
    return connection_1.db
        .update(schema_identity_1.workerProfiles)
        .set(data)
        .where((0, drizzle_orm_1.eq)(schema_identity_1.workerProfiles.userId, userId))
        .returning();
}
//# sourceMappingURL=users.service.js.map