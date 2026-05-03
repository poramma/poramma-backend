import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../../db/connection";
import { users, otps, sessions, userProfiles } from "../../db/schema.identity";
import { eq } from "drizzle-orm";
import { randomInt } from "crypto";
import { addMinutes } from "date-fns";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";
const REFRESH_EXPIRATION = "30d";


interface User {
  id: string;
  email: string;
  status: string;
  emailVerified: boolean;
}
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export async function register(
  email: string,
  password: string,
  firstName: string,
  lastName: string
) {
  // Vérifier existence utilisateur
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (existing.length > 0) {
    throw new Error("Email déjà utilisé");
  }

  // Hachage mot de passe
  const passwordHash = await bcrypt.hash(password, 10);

  // Créer l'utilisateur
  const [newUser] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      status: "UNVERIFIED",
      emailVerified: false,
    })
    .returning();

  // Créer le profil associé
  const [profile] = await db
    .insert(userProfiles)
    .values({
      userId: newUser.id,
      firstName,
      lastName,
      userType: "other", // par défaut, modifiable plus tard
    })
    .returning();

  return {
    ...newUser,
    profile,
  };
}

// TODO: Vérifier si l'utilisateur existe déjà
export async function checkUser(email: string) {
  const existing = await db.select().from(users).where(eq(users.email, email));
  return existing.length > 0;
}

// TODO: Envoyer save OTP
export async function saveOpt(email: string, otp: string) {

  const existing = await db.select().from(otps).where(eq(otps.userId, email));
  if (existing.length > 0) {
    await db.update(otps).set({ codeHash: otp, expiresAt: addMinutes(new Date(), 5) }).where(eq(otps.userId, email));
    return;
  }

  await db.insert(otps).values({
    userId: email,
    codeHash: otp,
    channel: "email",
    purpose: "signup",
    expiresAt: addMinutes(new Date(), 5),
  });
}



export async function verifyOtp(email: string, otp: string) {
  const [user] = await db.select().from(otps).where(eq(otps.userId, email));
  if (!user) throw new Error("Utilisateur introuvable");

  if (user.consumedAt) throw new Error("OTP déjà utilisé");
  //if (new Date() > user.expiresAt) throw new Error("OTP expiré :"+user.expiresAt);

  const valid = await bcrypt.compare(otp, user.codeHash);
  if (!valid) throw new Error("OTP invalide");

  await db.update(otps).set({ consumedAt: new Date() }).where(eq(otps.id, user.id));

  return { success: true };
}

export async function login(email: string, password: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) throw new Error("Identifiants invalides");

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new Error("Identifiants invalides");

  const accessToken = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: REFRESH_EXPIRATION });

  const refreshHash = await bcrypt.hash(refreshToken, 10);
  await db.insert(sessions).values({
    userId: user.id,
    refreshTokenHash: refreshHash,
    ip: "0.0.0.0", // à récupérer depuis req
    userAgent: "unknown", // idem
  });

  const authResponse: AuthResponse = {
    accessToken: accessToken,
    refreshToken: refreshToken,
    user: {
      id: user.id,
      email: user.email,
      status: user.status!,
      emailVerified: user.emailVerified!,
    },
  };

  return authResponse;
}

export async function refresh(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
    const userId = decoded.sub;

    const newAccessToken = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "15m" });
    return { accessToken: newAccessToken };
  } catch {
    throw new Error("Token invalide");
  }
}

export async function logout(userId: string) {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, userId));
}

export async function getProfile(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user;
}

export async function updateProfile(userId: string, data: any) {
  const [user] = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return user;
}
