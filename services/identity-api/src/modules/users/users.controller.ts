import { Request, Response, NextFunction } from "express";
import * as service from "./users.service";
import {
  updatePersonalInfoDto,
  updateAddressDto,
  updateStudentProfileDto,
  updateWorkerProfileDto,
  updateUserStatusDto,
  enrollStudentDto,
  verifyEmailDto,
} from "./dto";
import { ok } from "@poramma/dto";
import { ValidationError, asyncHandler } from "@poramma/utils";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

/** :id doit être l'appelant lui-même — voir users.routes.ts. */
export function requireSelf(req: Request, res: Response, next: NextFunction) {
  if (req.params.id !== (req as any).userId) {
    return res.status(403).json({ error: "Accès non autorisé à ce profil" });
  }
  next();
}

export async function getUser(req: Request, res: Response) {
  try {
    const user = await service.getUserById(req.params.id);
    res.json(user);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

export async function getUserProfile(req: Request, res: Response) {
    try {
      const userId = req.params.id || (req as any).user?.id; // si tu ajoutes auth middleware
      const profile = await service.getUserProfile(userId);
      res.json(profile);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
}

export async function updateUserStatus(req: Request, res: Response) {
    const parsed = updateUserStatusDto.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }
  
    try {
      const updated = await service.updateUserStatus(req.params.id, parsed.data.status);
      res.json({ message: "Statut mis à jour avec succès", user: updated });
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
}

export async function updatePersonalInfo(req: Request, res: Response) {
  const parsed = updatePersonalInfoDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });
  
  try {
    const result = await service.updatePersonalInfo(req.params.id, parsed.data);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

export async function updateAddress(req: Request, res: Response) {
  const parsed = updateAddressDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const result = await service.updateAddress(req.params.id, parsed.data);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

export async function updateStudentProfile(req: Request, res: Response) {
  const parsed = updateStudentProfileDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const result = await service.updateStudentProfile(req.params.id, parsed.data);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

export async function updateWorkerProfile(req: Request, res: Response) {
  const parsed = updateWorkerProfileDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const result = await service.updateWorkerProfile(req.params.id, parsed.data);
    res.json(result);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
}

// POST /users/students/enroll — walk-in enrollment by an authorized agent.
export async function enrollStudent(req: Request, res: Response) {
  const parsed = enrollStudentDto.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ errors: parsed.error.flatten() });

  try {
    const enrolledBy = (req as any).userId;
    const student = await service.enrollStudent(parsed.data, enrolledBy);
    res.status(201).json(ok(student, undefined, "Étudiant enrôlé avec succès."));
  } catch (err: any) {
    res.status(err.httpStatus ?? 409).json({ error: err.message });
  }
}

// POST /users/me/:id/verify-email — le titulaire confirme le code reçu à l'enrôlement.
export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const parsed = verifyEmailDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  await service.verifyEnrollmentEmail(req.params.id, parsed.data.otp);
  res.json(ok(null, undefined, "Email confirmé."));
});

// POST /users/me/:id/resend-verification — un nouveau code remplace le précédent.
export const resendVerification = asyncHandler(async (req: Request, res: Response) => {
  await service.resendEnrollmentVerification(req.params.id);
  res.json(ok(null, undefined, "Un nouveau code a été envoyé."));
});
