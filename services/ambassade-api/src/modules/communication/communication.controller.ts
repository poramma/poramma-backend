import { Request, Response } from "express";
import multer from "multer";
import * as svc from "./communication.service";
import {
  createCampagneDto,
  updateCampagneDto,
  listCampagnesQueryDto,
  estimateRecipientsDto,
  uploadAttachmentDto,
  reorderAttachmentsDto,
  updateAttachmentDto,
  scheduleCampagneDto,
} from "./dto";
import { ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // vidéos jusqu'à 100 Mo, voir CampagneMediaStep.tsx
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "video/mp4", "video/webm", "application/pdf"];

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(new ValidationError("Type de fichier non autorisé", { file: [`${file.mimetype} not allowed`] }));
      return;
    }
    cb(null, true);
  },
});

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

function actorOf(req: Request) {
  return { userId: (req as any).userId as string, roleName: (req as any).roleName as string | null };
}

export async function listCampagnes(req: Request, res: Response) {
  const parsed = listCampagnesQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  res.json(ok(await svc.listCampagnes(parsed.data)));
}

export async function getCampagne(req: Request, res: Response) {
  res.json(ok(await svc.getCampagne(req.params.id)));
}

export async function createCampagne(req: Request, res: Response) {
  const parsed = createCampagneDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.status(201).json(ok(await svc.createCampagne(parsed.data, actorOf(req))));
}

export async function updateCampagne(req: Request, res: Response) {
  const parsed = updateCampagneDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(await svc.updateCampagne(req.params.id, parsed.data)));
}

export async function sendCampagne(req: Request, res: Response) {
  res.json(ok(await svc.sendCampagne(req.params.id, actorOf(req))));
}

export async function scheduleCampagne(req: Request, res: Response) {
  const parsed = scheduleCampagneDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(await svc.scheduleCampagne(req.params.id, parsed.data.scheduledAt)));
}

export async function cancelCampagne(req: Request, res: Response) {
  res.json(ok(await svc.cancelCampagne(req.params.id)));
}

export async function duplicateCampagne(req: Request, res: Response) {
  res.status(201).json(ok(await svc.duplicateCampagne(req.params.id, actorOf(req))));
}

export async function listDeliveries(req: Request, res: Response) {
  res.json(ok(await svc.listDeliveries(req.params.id)));
}

export async function resendToFailed(req: Request, res: Response) {
  res.json(ok(await svc.resendToFailed(req.params.id)));
}

export async function uploadAttachment(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ValidationError("Fichier requis", { file: ["Required"] });
  // Un fichier vide serait publié comme un média cassé chez les citoyens.
  if (file.size === 0) throw new ValidationError("Le fichier est vide", { file: ["Empty file"] });

  const parsed = uploadAttachmentDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const attachment = await svc.uploadAttachment(req.params.id, file.buffer, file.originalname, file.mimetype, parsed.data, actorOf(req));
  res.status(201).json(ok(attachment));
}

export async function getCampagneFile(req: Request, res: Response) {
  const { buffer, contentType, filename } = await svc.getCampagneFile(req.params.id, req.params.fileId);
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
}

export async function removeAttachment(req: Request, res: Response) {
  await svc.removeAttachment(req.params.id, req.params.attachmentId);
  res.status(204).send();
}

/** PATCH /communication/campagnes/:id/attachments/:attachmentId — bannière (carrousel) et légende. */
export async function updateAttachment(req: Request, res: Response) {
  const parsed = updateAttachmentDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(await svc.updateAttachment(req.params.id, req.params.attachmentId, parsed.data)));
}

export async function reorderAttachments(req: Request, res: Response) {
  const parsed = reorderAttachmentsDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  await svc.reorderAttachments(req.params.id, parsed.data.orderedAttachmentIds);
  res.status(204).send();
}

export async function estimateRecipients(req: Request, res: Response) {
  const parsed = estimateRecipientsDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(await svc.estimateRecipients(parsed.data)));
}
