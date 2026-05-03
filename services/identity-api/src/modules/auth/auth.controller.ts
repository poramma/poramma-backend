import { Request, Response } from "express";
import {
  registerDto,
  verifyOtpDto,
  loginDto,
  refreshDto,
  updateProfileDto,
} from "./dto";
import * as authService from "./auth.service";
import bcrypt from "bcryptjs";
import { sendMail } from "@fivision/mailer";

// POST /register
export async function register(req: Request, res: Response) {
  const parsed = registerDto.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  try {
    const user = await authService.register(parsed.data.email, parsed.data.password, parsed.data.firstName, parsed.data.lastName);
    res.status(201).json({ message: "Inscription réussie. OTP envoyé.", user });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

export async function sendOtp(req: Request, res: Response) {
  const { emailOrPhone } = req.body;
  if (!emailOrPhone) {
    return res.status(400).json({ message: "Email requis" });
  }

  try {
    // Générer OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 chiffres
    const codeHash = await bcrypt.hash(otp, 10);

    // Vérifier si l'utilisateur existe déjà
    const userExists = await authService.checkUser(emailOrPhone);
    if (userExists) {
      return res.status(400).json({ message: "Email déjà utilisé" });
    }

    // Sauvegarder en DB
    await authService.saveOpt(emailOrPhone, codeHash);

    // Envoyer par email
    await sendMail({
      to: emailOrPhone,
      subject: "Votre code OTP Fivision",
      html: `
        <h2>Bienvenue sur Fivision 🎉</h2>
        <p>Votre code de vérification est :</p>
        <h1 style="color:#2563eb">${otp}</h1>
        <p>Ce code est valable pendant 5 minutes.</p>
      `,
    });

    res.json({ message: "OTP envoyé avec succès" });
  } catch (err: any) {
    console.error("Erreur OTP:", err);
    res.status(500).json({ message: "Impossible d’envoyer l’OTP" });
  }
}


// POST /verify-otp
export async function verifyOtp(req: Request, res: Response) {
  const parsed = verifyOtpDto.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  try {
    await authService.verifyOtp(parsed.data.email, parsed.data.otp);
    res.status(200).json({ message: "Compte vérifié avec succès." });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// POST /login
export async function login(req: Request, res: Response) {
  const parsed = loginDto.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  try {
    const tokens = await authService.login(parsed.data.email, parsed.data.password);
    res.status(200).json(tokens);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}

// POST /refresh
export async function refresh(req: Request, res: Response) {
  const parsed = refreshDto.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  try {
    const newAccessToken = await authService.refresh(parsed.data.refreshToken);
    res.status(200).json(newAccessToken);
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
}

// POST /logout
export async function logout(req: Request, res: Response) {
  try {
    const userId = (req as any).userId;
    await authService.logout(userId);
    res.status(200).json({ message: "Déconnexion réussie." });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// GET /me
export async function me(req: Request, res: Response) {
  try {
    const userId = (req as any).params.userId;
    const user = await authService.getProfile(userId);
    res.status(200).json(user);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}

// PATCH /profile
export async function updateProfile(req: Request, res: Response) {
  const parsed = updateProfileDto.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  try {
    const userId = (req as any).userId;
    const updated = await authService.updateProfile(userId, parsed.data);
    res.status(200).json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
}
