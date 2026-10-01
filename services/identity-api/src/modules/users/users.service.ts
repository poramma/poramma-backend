import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { addMinutes } from "date-fns";
import { db } from "../../db/connection";
import { users, userProfiles, studentProfiles, workerProfiles, studentScholarships, otps } from "../../db/schema.identity";
import { eq, and, isNull } from "drizzle-orm";
import { ConflictError, NotFoundError, UnauthorizedError } from "@poramma/utils";
import { sendMail, renderEmail } from "@poramma/mailer";
import { writeAudit } from "../../shared/audit";

/** Mot de passe par défaut des comptes enrôlés sur place — communiqué à l'étudiant
 * de vive voix par l'agent ET par email ; renouvelé chaque année pour ne pas rester
 * indéfiniment identique. `mustChangePassword` force son remplacement dès la
 * première connexion (voir profile.service.ts's updateMyPassword). */
function defaultStudentPassword(): string {
  return `Poramma@${new Date().getFullYear()}`;
}

const ENROLL_VERIFY_PURPOSE = "enroll-verify";
const ENROLL_VERIFY_TTL_MINUTES = 15;

async function issueEnrollmentVerification(userId: string, email: string, firstName: string) {
  // randomInt (CSPRNG), même principe que /auth/send-otp — ce code protège
  // la preuve de possession de la boîte mail, pas juste une formalité.
  const otp = randomInt(100000, 1000000).toString();
  const codeHash = await bcrypt.hash(otp, 10);

  await db.insert(otps).values({
    userId,
    codeHash,
    channel: "email",
    purpose: ENROLL_VERIFY_PURPOSE,
    expiresAt: addMinutes(new Date(), ENROLL_VERIFY_TTL_MINUTES),
  });

  await sendMail({
    to: email,
    subject: "Confirmez votre email — compte Poramma",
    html: renderEmail({
      title: `Bienvenue sur Poramma, ${firstName}`,
      paragraphs: [
        "Un compte étudiant a été créé pour vous lors de votre passage à l'ambassade.",
        "Avant de pouvoir utiliser votre espace, confirmez que cette adresse email vous appartient bien en saisissant ce code :",
      ],
      rawHtml: `<p style="margin:8px 0 18px;font-size:34px;letter-spacing:8px;font-weight:700;color:#00572c;">${otp}</p>`,
      footer: `Ce code est valable ${ENROLL_VERIFY_TTL_MINUTES} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    }),
  });
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
 * Walk-in enrollment: an agent creates a student account on the spot
 * (identity already checked in person, so no public OTP round-trip at
 * creation time), mirroring agents.service.ts's createAgent. No `agents`
 * row and no `user_roles` row is created — students never hold a staff
 * role, same as the public OTP registration path.
 *
 * The account starts UNVERIFIED with a *default* password
 * (defaultStudentPassword — easy for the agent to communicate verbally) and
 * mustChangePassword=true: the student must set their own password on first
 * login (POST /profile/password, which clears the flag) before reaching the
 * app, AND confirm the email address with the code just sent (POST
 * /users/me/:id/verify-email) — see frontend-community's RequireOnboarded.
 * `data.password`, if given, overrides the default (kept for any caller
 * that still wants to set an explicit password).
 */
export async function enrollStudent(data: EnrollStudentInput, enrolledBy: string) {
  const [existingEmail] = await db.select().from(users).where(eq(users.email, data.email));
  if (existingEmail) throw new ConflictError("Email déjà utilisé");

  const temporaryPassword = data.password ?? defaultStudentPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  const created = await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        email: data.email,
        phone: data.phone ?? null,
        passwordHash,
        status: "UNVERIFIED",
        emailVerified: false,
        mustChangePassword: true,
      })
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
    html: renderEmail({
      title: `Bienvenue sur Poramma, ${data.firstName}`,
      paragraphs: [
        "Un compte étudiant a été créé pour vous lors de votre passage à l'ambassade.",
        `Identifiant : ${data.email}`,
      ],
      rawHtml: `<p style="margin:0 0 14px;font-size:15px;color:#374151;">Mot de passe par défaut : <strong style="font-size:17px;letter-spacing:1px;">${temporaryPassword}</strong></p>`,
      footer: "Ce mot de passe vous sera redemandé dès votre première connexion, avant tout accès à l'application. Un second email va suivre avec un code pour confirmer cette adresse.",
    }),
  });

  // Email séparé pour le code de vérification — deux enjeux distincts (le mot
  // de passe qu'on connaît déjà vs. la preuve qu'on lit bien cette boîte).
  await issueEnrollmentVerification(created.user.id, data.email, data.firstName);

  await writeAudit({
    action: "ENROLL",
    entityType: "USER",
    entityId: created.user.id,
    actor: { userId: enrolledBy, roleName: null },
    details: { email: data.email, onSite: true },
  });

  return {
    id: created.user.id,
    email: created.user.email,
    firstName: created.profile.firstName,
    lastName: created.profile.lastName,
    temporaryPassword,
  };
}

/**
 * POST /users/me/:id/verify-email — le titulaire du compte saisit le code
 * reçu par email lors de l'enrôlement (ou d'un renvoi). Purement
 * self-service : requireSelf en amont (voir users.routes.ts), pas de
 * permission agent — c'est l'étudiant qui confirme sa propre boîte mail.
 */
export async function verifyEnrollmentEmail(userId: string, otp: string) {
  const [record] = await db
    .select()
    .from(otps)
    .where(and(eq(otps.userId, userId), eq(otps.purpose, ENROLL_VERIFY_PURPOSE)));
  if (!record) throw new NotFoundError("Aucun code en attente pour ce compte");
  if (record.consumedAt) throw new ConflictError("Ce code a déjà été utilisé");
  if (record.expiresAt < new Date()) throw new UnauthorizedError("Ce code a expiré, demandez-en un nouveau");

  const valid = await bcrypt.compare(otp, record.codeHash);
  if (!valid) throw new UnauthorizedError("Code invalide");

  await db.transaction(async (tx) => {
    await tx.update(otps).set({ consumedAt: new Date() }).where(eq(otps.id, record.id));
    await tx.update(users).set({ emailVerified: true, status: "VERIFIED", updatedAt: new Date() }).where(eq(users.id, userId));
  });

  await writeAudit({
    action: "VERIFY_EMAIL",
    entityType: "USER",
    entityId: userId,
    actor: { userId, roleName: null },
  });
}

/** POST /users/me/:id/resend-verification — un nouveau code invalide l'ancien. */
export async function resendEnrollmentVerification(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new NotFoundError("Utilisateur introuvable");
  if (user.emailVerified) throw new ConflictError("Cet email est déjà confirmé");

  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

  // Un ancien code non consommé ne doit plus être utilisable une fois un
  // nouveau envoyé — sinon un code intercepté plus tôt resterait valable.
  await db
    .update(otps)
    .set({ consumedAt: new Date() })
    .where(and(eq(otps.userId, userId), eq(otps.purpose, ENROLL_VERIFY_PURPOSE), isNull(otps.consumedAt)));

  await issueEnrollmentVerification(userId, user.email, profile?.firstName ?? "");
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
