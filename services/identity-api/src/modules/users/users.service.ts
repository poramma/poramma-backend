import { db } from "../../db/connection";
import { users, userProfiles, studentProfiles, workerProfiles, studentScholarships } from "../../db/schema.identity";
import { eq } from "drizzle-orm";

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
  
    const [user] = await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId)).returning();
    //if it's the first time updating the profile, then insert in userProfiles
    if (!user) {
      await db.insert(userProfiles).values({ userId, ...data }).returning();
    }

    return {
        firstName: user.firstName,
        lastName: user.lastName,
        gender: user.gender,
        bio: user.bio,
        birthDate: user.birthDate,
    };
}

export async function updateAddress(userId: string, data: any) {
    const [user] = await db.update(userProfiles).set(data).where(eq(userProfiles.userId, userId)).returning();
    //if it's the first time updating the profile, then insert in userProfiles
    if (!user) {
      await db.insert(userProfiles).values({ userId, ...data }).returning();
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

  const [student] = await db
    .update(studentProfiles)
    .set({
      university: data.university,
      faculty: data.faculty,
      studyLevel: data.studyLevel,
    })
    .where(eq(studentProfiles.userId, userId))
    .returning();

  if (data.scholarship) {
    await db
      .insert(studentScholarships)
      .values({ ...data.scholarship, studentProfileId: student.id })
      .onConflictDoUpdate({ target: studentScholarships.studentProfileId, set: data.scholarship });
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
    const [worker] = await db.update(workerProfiles).set(data).where(eq(workerProfiles.userId, userId)).returning();
    if (!worker) {
      await db.insert(workerProfiles).values({ userId, ...data }).returning();
    }
    return {
        employer: worker.employer,
        profession: worker.profession,
        contractType: worker.contractType,
    };
}
