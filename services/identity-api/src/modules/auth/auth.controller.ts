import { Request, Response } from "express";
import {
  registerDto,
  verifyOtpDto,
  loginDto,
  refreshDto,
  updateProfileDto,
  switchRoleDto,
  forgotPasswordDto,
  resetPasswordDto,
} from "./dto";
import * as authService from "./auth.service";
import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { sendMail, renderEmail } from "@poramma/mailer";
import { ok } from "@poramma/dto";
import { ValidationError, ConflictError, RateLimitError } from "@poramma/utils";
import { checkRateLimit } from "@poramma/cache";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

// Fenêtres larges volontairement — l'objectif est de freiner un
// bruteforce/spam automatisé, pas de gêner un utilisateur qui se trompe de
// mot de passe deux fois de suite.
const LOGIN_RATE_LIMIT = 10;
const LOGIN_RATE_WINDOW_SECONDS = 15 * 60;
const OTP_RATE_LIMIT = 5;
const OTP_RATE_WINDOW_SECONDS = 15 * 60;

async function enforceRateLimit(key: string, limit: number, windowSeconds: number) {
  const { allowed } = await checkRateLimit(key, limit, windowSeconds);
  if (!allowed) throw new RateLimitError("Trop de tentatives. Veuillez réessayer plus tard.");
}

// POST /register
export async function register(req: Request, res: Response) {
  const parsed = registerDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const user = await authService.register(
    parsed.data.email,
    parsed.data.password,
    parsed.data.firstName,
    parsed.data.lastName
  );
  res.status(201).json(ok(user, undefined, "Inscription réussie. OTP envoyé."));
}

export async function sendOtp(req: Request, res: Response) {
  const { emailOrPhone } = req.body;
  if (!emailOrPhone) throw new ValidationError("Email requis", { emailOrPhone: ["Champ requis"] });

  await enforceRateLimit(`otp:${emailOrPhone}`, OTP_RATE_LIMIT, OTP_RATE_WINDOW_SECONDS);

  // randomInt (CSPRNG) et non Math.random : le code protège la création de compte.
  const otp = randomInt(100000, 1000000).toString();
  const codeHash = await bcrypt.hash(otp, 10);

  const userExists = await authService.checkUser(emailOrPhone);
  if (userExists) throw new ConflictError("Email déjà utilisé");

  await authService.saveOpt(emailOrPhone, codeHash);

  try {
    await sendMail({
      to: emailOrPhone,
      subject: "Votre code de vérification Poramma",
      html: renderEmail({
        title: "Votre code de vérification",
        paragraphs: ["Bienvenue sur Poramma ! Saisissez ce code pour créer votre compte :"],
        // `otp` est un nombre à 6 chiffres généré ici : aucune donnée utilisateur dans ce bloc HTML.
        rawHtml: `<p style="margin:8px 0 18px;font-size:34px;letter-spacing:8px;font-weight:700;color:#00572c;">${otp}</p>`,
        footer: "Ce code est valable 5 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
      }),
    });
  } catch (err) {
    console.error("[auth] envoi du code OTP échoué :", (err as Error).message);
    throw new ValidationError("Le code n'a pas pu être envoyé. Vérifiez l'adresse email puis réessayez.", {
      emailOrPhone: ["Envoi impossible"],
    });
  }

  res.json(ok(null, undefined, "OTP envoyé avec succès"));
}

// POST /verify-otp
export async function verifyOtp(req: Request, res: Response) {
  const parsed = verifyOtpDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const result = await authService.verifyOtp(
    parsed.data.email,
    parsed.data.otp,
    parsed.data.password,
    parsed.data.firstName,
    parsed.data.lastName,
    parsed.data.phone
  );
  res.status(201).json(ok(result, undefined, "Compte créé avec succès."));
}

// POST /login
export async function login(req: Request, res: Response) {
  const parsed = loginDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  await enforceRateLimit(`login:${req.ip}`, LOGIN_RATE_LIMIT, LOGIN_RATE_WINDOW_SECONDS);

  const ua = req.headers["user-agent"];
  const tokens = await authService.login(
    parsed.data.email,
    parsed.data.password,
    req.ip,
    typeof ua === "string" ? ua : null,
    parsed.data.rememberMe ?? false
  );
  res.json(ok(tokens));
}

// POST /refresh
export async function refresh(req: Request, res: Response) {
  const parsed = refreshDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const tokens = await authService.refresh(parsed.data.refreshToken);
  res.json(ok(tokens));
}

// POST /logout — requireAuth-guarded, req.userId / req.sessionId set from the JWT.
export async function logout(req: Request, res: Response) {
  const userId = (req as any).userId;
  const sessionId = (req as any).sessionId;
  await authService.logout(userId, sessionId);
  res.json(ok(null, undefined, "Déconnexion réussie."));
}

// GET /me — requireAuth-guarded.
export async function me(req: Request, res: Response) {
  const userId = (req as any).userId;
  const user = await authService.getProfile(userId);
  res.json(ok(user));
}

// PATCH /profile — requireAuth-guarded.
export async function updateProfile(req: Request, res: Response) {
  const parsed = updateProfileDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const userId = (req as any).userId;
  const updated = await authService.updateProfile(userId, parsed.data);
  res.json(ok(updated));
}

// GET /roles — system role catalog (for the switch-role UI).
export async function getRoles(_req: Request, res: Response) {
  const roles = await authService.listSystemRoles();
  res.json(ok(roles));
}

// GET /permissions — the caller's own permission codes.
export async function getPermissions(req: Request, res: Response) {
  const userId = (req as any).userId;
  const codes = await authService.getMyPermissions(userId);
  res.json(ok(codes));
}

// POST /switch-role — requireAuth-guarded.
export async function switchRole(req: Request, res: Response) {
  const parsed = switchRoleDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const userId = (req as any).userId;
  const sessionId = (req as any).sessionId;
  const result = await authService.switchRole(userId, sessionId, parsed.data.roleId);
  res.json(ok(result));
}

// POST /forgot-password
const FORGOT_RATE_LIMIT = 5;
const FORGOT_RATE_WINDOW_SECONDS = 15 * 60;
const RESET_RATE_LIMIT = 5; // essais de code par adresse et par fenêtre — borne le devinage des 900 000 codes possibles

export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotPasswordDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Adresse email invalide", zodDetails(parsed.error));
  const email = parsed.data.email.trim();

  await enforceRateLimit(`forgot-ip:${req.ip}`, FORGOT_RATE_LIMIT * 4, FORGOT_RATE_WINDOW_SECONDS);
  await enforceRateLimit(`forgot:${email.toLowerCase()}`, FORGOT_RATE_LIMIT, FORGOT_RATE_WINDOW_SECONDS);

  const reset = await authService.createPasswordResetCode(email);
  if (reset) {
    try {
      await sendMail({
        to: reset.email,
        subject: "Réinitialisation de votre mot de passe Poramma",
        html: renderEmail({
          title: "Réinitialisation du mot de passe",
          paragraphs: [
            `${reset.firstName ? `Bonjour ${reset.firstName}, v` : "V"}ous avez demandé à réinitialiser votre mot de passe. Saisissez ce code sur la page « Mot de passe oublié » :`,
          ],
          // `code` est un nombre à 6 chiffres généré côté serveur : aucune donnée utilisateur dans ce bloc HTML.
          rawHtml: `<p style="margin:8px 0 18px;font-size:34px;letter-spacing:8px;font-weight:700;color:#00572c;">${reset.code}</p>`,
          footer: "Ce code est valable 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe reste inchangé.",
        }),
      });
    } catch (err) {
      // On ne révèle pas l'échec à l'appelant (réponse identique dans tous les cas) — journalisé côté serveur.
      console.error("[auth] envoi du code de réinitialisation échoué :", (err as Error).message);
    }
  }

  res.json(ok(null, undefined, "Si un compte existe pour cette adresse, un code de réinitialisation vient d'être envoyé."));
}

// POST /reset-password
export async function resetPassword(req: Request, res: Response) {
  const parsed = resetPasswordDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));
  const { email, otp, newPassword } = parsed.data;

  await enforceRateLimit(`reset:${email.toLowerCase()}`, RESET_RATE_LIMIT, FORGOT_RATE_WINDOW_SECONDS);
  await enforceRateLimit(`reset-ip:${req.ip}`, RESET_RATE_LIMIT * 4, FORGOT_RATE_WINDOW_SECONDS);

  const done = await authService.resetPasswordWithCode({ email, code: otp, newPassword, ip: req.ip ?? null, ua: req.headers["user-agent"] ?? null });

  try {
    await sendMail({
      to: done.email,
      subject: "Votre mot de passe Poramma a été modifié",
      html: renderEmail({
        title: "Mot de passe modifié",
        paragraphs: [
          "Le mot de passe de votre compte vient d'être modifié et toutes vos sessions ont été déconnectées.",
          "Si vous n'êtes pas à l'origine de ce changement, contactez immédiatement l'ambassade.",
        ],
      }),
    });
  } catch (err) {
    console.error("[auth] email de confirmation de réinitialisation échoué :", (err as Error).message);
  }

  res.json(ok(null, undefined, "Votre mot de passe a été modifié. Vous pouvez vous connecter."));
}
