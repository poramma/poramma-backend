"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeRegistrationStatus = computeRegistrationStatus;
exports.getRegistrationChecklist = getRegistrationChecklist;
exports.submitRegistration = submitRegistration;
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const etudiants_1 = require("../schema/etudiants");
const documents_1 = require("../schema/documents");
const identity_1 = require("../schema/identity");
const etudiants_2 = require("./etudiants");
const audit_1 = require("./audit");
function requiredDocumentsFor(userType, isScholarshipRecipient) {
    const docs = [
        {
            key: "identity",
            label: "Pièce d'identité (carte d'identité malienne ou passeport)",
            acceptedTypes: ["ID_CARD", "PASSPORT"],
        },
    ];
    if (userType === "student") {
        docs.push({ key: "school", label: "Certificat de scolarité", acceptedTypes: ["STUDENT_CERT", "STUDENT_CARD"] });
        if (isScholarshipRecipient) {
            docs.push({ key: "scholarship", label: "Justificatif de bourse", acceptedTypes: ["SCHOLARSHIP_PROOF"] });
        }
    }
    docs.push({ key: "consular", label: "Carte consulaire (si vous en avez une)", acceptedTypes: ["CONSULAR_CARD"], optional: true });
    docs.push({ key: "address", label: "Justificatif de domicile au Maroc", acceptedTypes: ["PROOF_ADDRESS"], optional: true });
    return docs;
}
function computeRegistrationStatus(row) {
    if (row.status === "VALIDATED")
        return "VALIDATED";
    if (row.status === "REJECTED")
        return "REJECTED";
    if (row.status === "SUSPENDED")
        return "SUSPENDED";
    return row.submittedAt ? "SUBMITTED" : "INCOMPLETE";
}
async function getRegistrationChecklist(db, userId) {
    const tracking = await (0, etudiants_2.ensureEtudiantRecord)(db, userId);
    const [profile] = await db.select().from(identity_1.identityUserProfiles).where((0, drizzle_orm_1.eq)(identity_1.identityUserProfiles.userId, userId));
    const userType = (profile?.userType ?? "other");
    const missingInfo = [];
    if (!profile?.firstName)
        missingInfo.push("Prénom");
    if (!profile?.lastName)
        missingInfo.push("Nom");
    if (!profile?.city)
        missingInfo.push("Ville de résidence au Maroc");
    let isScholarshipRecipient = false;
    if (userType === "student") {
        const [student] = await db.select().from(identity_1.identityStudentProfiles).where((0, drizzle_orm_1.eq)(identity_1.identityStudentProfiles.userId, userId));
        if (!student?.university)
            missingInfo.push("Université ou établissement");
        if (!student?.faculty)
            missingInfo.push("Faculté ou filière");
        if (!student?.studyLevel)
            missingInfo.push("Niveau d'études");
        if (student) {
            const [scholarship] = await db
                .select()
                .from(identity_1.identityStudentScholarships)
                .where((0, drizzle_orm_1.eq)(identity_1.identityStudentScholarships.studentProfileId, student.id));
            isScholarshipRecipient = !!scholarship?.isRecipient;
        }
    }
    else if (userType === "worker") {
        const [worker] = await db.select().from(identity_1.identityWorkerProfiles).where((0, drizzle_orm_1.eq)(identity_1.identityWorkerProfiles.userId, userId));
        if (!worker?.employer)
            missingInfo.push("Employeur");
        if (!worker?.profession)
            missingInfo.push("Profession");
    }
    const userDocs = await db
        .select({ id: documents_1.documents.id, type: documents_1.documents.type, status: documents_1.documents.status })
        .from(documents_1.documents)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(documents_1.documents.ownerUserId, userId), (0, drizzle_orm_1.notInArray)(documents_1.documents.status, ["REJECTED", "EXPIRED"])));
    const documentChecklist = requiredDocumentsFor(userType, isScholarshipRecipient).map((req) => {
        const match = userDocs.find((d) => req.acceptedTypes.includes(d.type));
        return {
            key: req.key,
            label: req.label,
            acceptedTypes: req.acceptedTypes,
            optional: !!req.optional,
            provided: !!match,
            documentId: match?.id ?? null,
            documentStatus: match?.status ?? null,
        };
    });
    const missingDocuments = documentChecklist.filter((d) => !d.optional && !d.provided).map((d) => d.label);
    const registrationStatus = computeRegistrationStatus(tracking);
    const canSubmit = missingInfo.length === 0 &&
        missingDocuments.length === 0 &&
        (registrationStatus === "INCOMPLETE" || registrationStatus === "REJECTED");
    return {
        registrationStatus,
        status: tracking.status,
        isValidated: tracking.status === "VALIDATED",
        submittedAt: tracking.submittedAt,
        inue: tracking.inue,
        inueAssignedAt: tracking.inueAssignedAt,
        reviewNote: tracking.reviewNote,
        reviewedAt: tracking.reviewedAt,
        userType,
        info: { complete: missingInfo.length === 0, missing: missingInfo },
        documents: { complete: missingDocuments.length === 0, missing: missingDocuments, items: documentChecklist },
        canSubmit,
    };
}
async function submitRegistration(db, userId) {
    const checklist = await getRegistrationChecklist(db, userId);
    if (checklist.registrationStatus === "SUBMITTED") {
        throw new utils_1.ConflictError("Votre dossier est déjà en cours d'examen par l'ambassade.");
    }
    if (checklist.registrationStatus === "VALIDATED") {
        throw new utils_1.ConflictError("Votre enregistrement est déjà validé.");
    }
    if (checklist.registrationStatus === "SUSPENDED") {
        throw new utils_1.ConflictError("Votre dossier est suspendu — contactez l'ambassade.");
    }
    if (!checklist.canSubmit) {
        const details = {};
        if (checklist.info.missing.length)
            details.informations = checklist.info.missing;
        if (checklist.documents.missing.length)
            details.documents = checklist.documents.missing;
        throw new utils_1.ValidationError("Votre dossier est incomplet.", details);
    }
    await db.transaction(async (tx) => {
        const conn = tx;
        await conn
            .update(etudiants_1.etudiants)
            .set({ status: "PENDING", submittedAt: new Date(), updatedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(etudiants_1.etudiants.userId, userId));
        await (0, audit_1.writeAudit)(conn, {
            action: "SUBMIT_REGISTRATION",
            entityType: "ETUDIANT",
            entityId: (await conn.select({ id: etudiants_1.etudiants.id }).from(etudiants_1.etudiants).where((0, drizzle_orm_1.eq)(etudiants_1.etudiants.userId, userId)))[0].id,
            actor: { userId, roleName: null },
            details: { userType: checklist.userType, resubmission: checklist.registrationStatus === "REJECTED" },
        });
    });
    return getRegistrationChecklist(db, userId);
}
//# sourceMappingURL=registration.js.map