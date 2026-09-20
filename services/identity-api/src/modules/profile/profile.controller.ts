import { Request, Response } from "express";
import multer from "multer";
import * as profileService from "./profile.service";
import { updateOwnProfileDto, updatePreferencesDto, updatePasswordDto, activitiesQueryDto } from "./dto";
import { ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";

const SIGNATURE_MAX_SIZE = 2 * 1024 * 1024; // 2MB — une signature est une petite image
const SIGNATURE_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];

export const uploadSignatureMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: SIGNATURE_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!SIGNATURE_MIME_TYPES.includes(file.mimetype)) {
      cb(new ValidationError("Type de fichier non autorisé pour une signature", { file: [`${file.mimetype} not allowed`] }));
      return;
    }
    cb(null, true);
  },
});

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

export async function getMyProfile(req: Request, res: Response) {
  const userId = (req as any).userId;
  res.json(ok(await profileService.getMyProfile(userId)));
}

export async function updateMyProfile(req: Request, res: Response) {
  const parsed = updateOwnProfileDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const userId = (req as any).userId;
  res.json(ok(await profileService.updateMyProfile(userId, parsed.data)));
}

export async function updateMyPreferences(req: Request, res: Response) {
  const parsed = updatePreferencesDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const userId = (req as any).userId;
  res.json(ok(await profileService.updateMyPreferences(userId, parsed.data)));
}

export async function updateMyPassword(req: Request, res: Response) {
  const parsed = updatePasswordDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const userId = (req as any).userId;
  await profileService.updateMyPassword(userId, parsed.data.currentPassword, parsed.data.newPassword);
  res.json(ok(null, undefined, "Mot de passe mis à jour."));
}

export async function uploadSignature(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ValidationError("Fichier requis", { file: ["Required"] });

  const userId = (req as any).userId;
  res.json(ok(await profileService.uploadSignature(userId, file.buffer, file.originalname, file.mimetype)));
}

export async function getSignature(req: Request, res: Response) {
  const userId = (req as any).userId;
  const { buffer, contentType } = await profileService.getSignatureFile(userId);
  res.setHeader("Content-Type", contentType);
  res.send(buffer);
}

export async function deleteSignature(req: Request, res: Response) {
  const userId = (req as any).userId;
  await profileService.deleteSignature(userId);
  res.json(ok(null, undefined, "Signature supprimée."));
}

export async function getMyActivities(req: Request, res: Response) {
  const parsed = activitiesQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Paramètres invalides", zodDetails(parsed.error));

  const userId = (req as any).userId;
  const activities = await profileService.listActivities(userId, parsed.data.offset, parsed.data.limit);
  res.json(ok(activities));
}
