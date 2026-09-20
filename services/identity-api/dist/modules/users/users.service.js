"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrollStudent = enrollStudent;
exports.getUserById = getUserById;
exports.checkUser = checkUser;
exports.getUserProfile = getUserProfile;
exports.updateUserStatus = updateUserStatus;
exports.updatePersonalInfo = updatePersonalInfo;
exports.updateAddress = updateAddress;
exports.updateStudentProfile = updateStudentProfile;
exports.updateWorkerProfile = updateWorkerProfile;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const connection_1 = require("../../db/connection");
const schema_identity_1 = require("../../db/schema.identity");
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const mailer_1 = require("@poramma/mailer");
const audit_1 = require("../../shared/audit");
function generateTempPassword() {
    return crypto_1.default.randomBytes(9).toString("base64url");
}
async function enrollStudent(data, enrolledBy) {
    const [existingEmail] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.email, data.email));
    if (existingEmail)
        throw new utils_1.ConflictError("Email déjà utilisé");
    const tempPassword = data.password ?? generateTempPassword();
    const passwordHash = await bcryptjs_1.default.hash(tempPassword, 10);
    const created = await connection_1.db.transaction(async (tx) => {
        const [user] = await tx
            .insert(schema_identity_1.users)
            .values({ email: data.email, phone: data.phone ?? null, passwordHash, status: "VERIFIED", emailVerified: true })
            .returning();
        const [profile] = await tx
            .insert(schema_identity_1.userProfiles)
            .values({ userId: user.id, firstName: data.firstName, lastName: data.lastName, userType: "student" })
            .returning();
        const [student] = await tx
            .insert(schema_identity_1.studentProfiles)
            .values({
            userId: user.id,
            university: data.university ?? null,
            faculty: data.faculty ?? null,
            studyLevel: data.studyLevel ?? null,
        })
            .returning();
        if (data.scholarship) {
            await tx.insert(schema_identity_1.studentScholarships).values({ ...data.scholarship, studentProfileId: student.id });
        }
        return { user, profile, student };
    });
    await (0, mailer_1.sendMail)({
        to: data.email,
        subject: "Votre compte Poramma a été créé",
        html: `
      <h2>Bienvenue sur Poramma</h2>
      <p>Un compte étudiant a été créé pour vous lors de votre passage à l'ambassade.</p>
      <p>Identifiant : ${data.email}</p>
      <p>Mot de passe temporaire : <strong>${tempPassword}</strong></p>
      <p>Nous vous recommandons de le changer dès votre première connexion.</p>
    `,
    });
    await (0, audit_1.writeAudit)({
        action: "ENROLL",
        entityType: "USER",
        entityId: created.user.id,
        actor: { userId: enrolledBy, roleName: null },
        details: { email: data.email, onSite: true },
    });
    return { id: created.user.id, email: created.user.email, firstName: created.profile.firstName, lastName: created.profile.lastName };
}
async function getUserById(id) {
    const [user] = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, id));
    if (!user)
        throw new Error("Utilisateur introuvable");
    const [profile] = await connection_1.db.select().from(schema_identity_1.userProfiles).where((0, drizzle_orm_1.eq)(schema_identity_1.userProfiles.userId, id));
    const [student] = await connection_1.db.select().from(schema_identity_1.studentProfiles).where((0, drizzle_orm_1.eq)(schema_identity_1.studentProfiles.userId, id));
    const [worker] = await connection_1.db.select().from(schema_identity_1.workerProfiles).where((0, drizzle_orm_1.eq)(schema_identity_1.workerProfiles.userId, id));
    return { ...user, profile, student, worker };
}
async function checkUser(id) {
    const existing = await connection_1.db.select().from(schema_identity_1.users).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, id));
    return existing.length > 0;
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
    return {
        id: user.id,
        email: user.email,
        status: user.status,
        emailVerified: user.emailVerified,
    };
}
async function updatePersonalInfo(userId, data) {
    const ifUser = await checkUser(userId);
    if (!ifUser)
        throw new Error("Utilisateur introuvable");
    const { phone, ...profileData } = data;
    if (phone !== undefined) {
        await connection_1.db.update(schema_identity_1.users).set({ phone, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_identity_1.users.id, userId));
    }
    let [user] = await connection_1.db.update(schema_identity_1.userProfiles).set(profileData).where((0, drizzle_orm_1.eq)(schema_identity_1.userProfiles.userId, userId)).returning();
    if (!user) {
        [user] = await connection_1.db.insert(schema_identity_1.userProfiles).values({ userId, ...profileData }).returning();
    }
    return {
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
        gender: user.gender,
        bio: user.bio,
        birthDate: user.birthDate,
    };
}
async function updateAddress(userId, data) {
    let [user] = await connection_1.db.update(schema_identity_1.userProfiles).set(data).where((0, drizzle_orm_1.eq)(schema_identity_1.userProfiles.userId, userId)).returning();
    if (!user) {
        [user] = await connection_1.db.insert(schema_identity_1.userProfiles).values({ userId, ...data }).returning();
    }
    return {
        address: user.address,
        city: user.city,
        country: user.country,
        zipCode: user.zipCode,
    };
}
async function updateStudentProfile(userId, data) {
    const ifUser = await checkUser(userId);
    if (!ifUser)
        throw new Error("Utilisateur introuvable");
    let [student] = await connection_1.db
        .update(schema_identity_1.studentProfiles)
        .set({
        university: data.university,
        faculty: data.faculty,
        studyLevel: data.studyLevel,
    })
        .where((0, drizzle_orm_1.eq)(schema_identity_1.studentProfiles.userId, userId))
        .returning();
    if (!student) {
        [student] = await connection_1.db
            .insert(schema_identity_1.studentProfiles)
            .values({ userId, university: data.university, faculty: data.faculty, studyLevel: data.studyLevel })
            .returning();
    }
    if (data.scholarship) {
        const [existingScholarship] = await connection_1.db
            .select()
            .from(schema_identity_1.studentScholarships)
            .where((0, drizzle_orm_1.eq)(schema_identity_1.studentScholarships.studentProfileId, student.id));
        if (existingScholarship) {
            await connection_1.db
                .update(schema_identity_1.studentScholarships)
                .set(data.scholarship)
                .where((0, drizzle_orm_1.eq)(schema_identity_1.studentScholarships.id, existingScholarship.id));
        }
        else {
            await connection_1.db.insert(schema_identity_1.studentScholarships).values({ ...data.scholarship, studentProfileId: student.id });
        }
    }
    return {
        university: student.university,
        faculty: student.faculty,
        studyLevel: student.studyLevel,
        scholarship: data.scholarship,
    };
}
async function updateWorkerProfile(userId, data) {
    const ifUser = await checkUser(userId);
    if (!ifUser)
        throw new Error("Utilisateur introuvable");
    let [worker] = await connection_1.db.update(schema_identity_1.workerProfiles).set(data).where((0, drizzle_orm_1.eq)(schema_identity_1.workerProfiles.userId, userId)).returning();
    if (!worker) {
        [worker] = await connection_1.db.insert(schema_identity_1.workerProfiles).values({ userId, ...data }).returning();
    }
    return {
        employer: worker.employer,
        profession: worker.profession,
        contractType: worker.contractType,
    };
}
//# sourceMappingURL=users.service.js.map