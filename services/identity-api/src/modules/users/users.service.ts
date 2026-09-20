import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "../../db/connection";
import { users, userProfiles, studentProfiles, workerProfiles, studentScholarships } from "../../db/schema.identity";
import { eq } from "drizzle-orm";
import { ConflictError } from "@poramma/utils";
import { sendMail } from "@poramma/mailer";
import { writeAudit } from "../../shared/audit";

function generateTempPassword(): string {
  return crypto.randomBytes(9).toString("base64url");
}

interface EnrollStudentInput {
  email: string;
  password?: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  university?: string | null;
  faculty?: string | null;
  studyLevel?: string | null;
  scholarship?: { isRecipient: boolean; decisionNumber?: string | null; promotion?: string | null } | null;
}

/**
 * Walk-in enrollment: an agent creates a fully-verified student account on
 * the spot (no OTP round-trip — identity already checked in person),
 * mirroring agents.service.ts's createAgent. No `agents` row and no
 * `user_roles` row is created — students never hold a staff role, same as
 * the public OTP registration path.
 */
export async function enrollStudent(data: EnrollStudentInput, enrolledBy: string) {
  const [existingEmail] = await db.select().from(users).where(eq(users.email, data.email));
  if (existingEmail) throw new ConflictError("Email déjà utilisé");

  const tempPassword = data.password ?? generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const created = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({ email: data.email, phone: data.phone ?? null, passwordHash, status: "VERIFIED", emailVerified: true })
      .returning();

    const [profile] = await tx
      .insert(userProfiles)
      .values({ userId: user.id, firstName: data.firstName, lastName: data.lastName, userType: "student" })
      .returning();

    const [student] = await tx
      .insert(studentProfiles)
      .values({
        userId: user.id,
        university: data.university ?? null,
        faculty: data.faculty ?? null,
        studyLevel: data.studyLevel ?? null,
      })
      .returning();

    if (data.scholarship) {
      await tx.insert(studentScholarships).values({ ...data.scholarship, studentProfileId: student.id });
    }

    return { user, profile, student };
  });

  await sendMail({
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

  await writeAudit({
    action: "ENROLL",
    entityType: "USER",
    entityId: created.user.id,
    actor: { userId: enrolledBy, roleName: null },
    details: { email: data.email, onSite: true },
  });

  return { id: created.user.id, email: created.user.email, firstName: created.profile.firstName, lastName: created.profile.lastName };
}

export async function getUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) throw new Error("Utilisateur introuvable");

  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, id));
  const [student] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, id));
  const [worker] = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, id));

  return { ...user, profile, student, worker };
}

// TODO: Vérifier si l'utilisateur existe déjà
export async function checkUser(id: string) {
    const existing = await db.select().from(users).where(eq(users.id, id));
    return existing.length > 0;
}
  

export async function getUserProfile(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) throw new Error("Utilisateur introuvable");
  
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  
    const [student] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, userId));
    let scholarship: any = null;
    if (student) {
      [scholarship] = await db.select().from(studentScholarships).where(eq(studentScholarships.studentProfileId, student.id));
    }
  
    const [worker] = await db.select().from(workerProfiles).where(eq(workerProfiles.userId, userId));
  
    // ⚠️ À connecter à documents et logs quand tes tables seront prêtes
    const documents: any[] = [];
    const logs: any[] = [];
  
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

export async function updateUserStatus(userId: string, status: string) {
    const [user] = await db
      .update(users)
      .set({ status })
      .where(eq(users.id, userId))
      .returning();
  
    if (!user) throw new Error("Utilisateur introuvable");
  
    return {
        id: user.id,
        email: user.email,
        status: user.status,
        emailVerified: user.emailVerified,
    };
  }

export async function updatePersonalInfo(userId: string, data: any) {
    const ifUser = await checkUser(userId);
    if (!ifUser) throw new Error("Utilisateur introuvable");

    // phone vit sur identity.users, pas sur user_profiles — l'ancienne version
    // l'envoyait à user_profiles où la colonne n'existe pas (ignoré en silence).
    const { phone, ...profileData } = data;
    if (phone !== undefined) {
      await db.update(users).set({ phone, updatedAt: new Date() }).where(eq(users.id, userId));
    }

    let [user] = await db.update(userProfiles).set(profileData).where(eq(userProfiles.userId, userId)).returning();
    //if it's the first time updating the profile, then insert in userProfiles
    if (!user) {
      [user] = await db.insert(userProfiles).values({ userId, ...profileData }).returning();
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

export async function updateAddress(userId: string, data: any) {
    let [user] = await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId)).returning();
    //if it's the first time updating the profile, then insert in userProfiles
    if (!user) {
      [user] = await db.insert(userProfiles).values({ userId, ...data }).returning();
    }

    return {
        address: user.address,
        city: user.city,
        country: user.country,
        zipCode: user.zipCode,
    };
}

export async function updateStudentProfile(userId: string, data: any) {
    const ifUser = await checkUser(userId);
    if (!ifUser) throw new Error("Utilisateur introuvable");

  let [student] = await db
    .update(studentProfiles)
    .set({
      university: data.university,
      faculty: data.faculty,
      studyLevel: data.studyLevel,
    })
    .where(eq(studentProfiles.userId, userId))
    .returning();

  //if it's the first time updating the profile, then insert in studentProfiles
  if (!student) {
    [student] = await db
      .insert(studentProfiles)
      .values({ userId, university: data.university, faculty: data.faculty, studyLevel: data.studyLevel })
      .returning();
  }

  if (data.scholarship) {
    // studentProfileId has no unique constraint, so onConflictDoUpdate has no
    // target to match against — check-then-write explicitly instead.
    const [existingScholarship] = await db
      .select()
      .from(studentScholarships)
      .where(eq(studentScholarships.studentProfileId, student.id));

    if (existingScholarship) {
      await db
        .update(studentScholarships)
        .set(data.scholarship)
        .where(eq(studentScholarships.id, existingScholarship.id));
    } else {
      await db.insert(studentScholarships).values({ ...data.scholarship, studentProfileId: student.id });
    }
  }

  return {
    university: student.university,
    faculty: student.faculty,
    studyLevel: student.studyLevel,
    scholarship: data.scholarship,
  };
}

export async function updateWorkerProfile(userId: string, data: any) {
    const ifUser = await checkUser(userId);
    if (!ifUser) throw new Error("Utilisateur introuvable");

    //if it's the first time updating the profile, then insert in workerProfiles
    let [worker] = await db.update(workerProfiles).set(data).where(eq(workerProfiles.userId, userId)).returning();
    if (!worker) {
      [worker] = await db.insert(workerProfiles).values({ userId, ...data }).returning();
    }
    return {
        employer: worker.employer,
        profession: worker.profession,
        contractType: worker.contractType,
    };
}
