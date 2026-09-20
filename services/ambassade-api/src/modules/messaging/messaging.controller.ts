import { Request, Response } from "express";
import multer from "multer";
import * as svc from "./messaging.service";
import { listThreadsQueryDto, createThreadDto, addParticipantDto, updateThreadStatusDto, sendMessageDto } from "./dto";
import { ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";

const MAX_FILE_SIZE = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

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

export async function listThreads(req: Request, res: Response) {
  const parsed = listThreadsQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  res.json(ok(await svc.listThreads((req as any).userId, parsed.data.demandeId)));
}

export async function getThread(req: Request, res: Response) {
  await svc.assertParticipant(req.params.id, (req as any).userId);
  res.json(ok(await svc.getThread(req.params.id, (req as any).userId)));
}

export async function createThread(req: Request, res: Response) {
  const parsed = createThreadDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.status(201).json(ok(await svc.createThread(parsed.data, actorOf(req))));
}

export async function addParticipant(req: Request, res: Response) {
  await svc.assertParticipant(req.params.id, (req as any).userId);

  const parsed = addParticipantDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(await svc.addParticipant(req.params.id, parsed.data.userId)));
}

export async function updateThreadStatus(req: Request, res: Response) {
  await svc.assertParticipant(req.params.id, (req as any).userId);

  const parsed = updateThreadStatusDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(await svc.updateThreadStatus(req.params.id, parsed.data.status)));
}

export async function listMessages(req: Request, res: Response) {
  await svc.assertParticipant(req.params.id, (req as any).userId);
  res.json(ok(await svc.listMessages(req.params.id)));
}

export async function sendMessage(req: Request, res: Response) {
  await svc.assertParticipant(req.params.id, (req as any).userId);

  const parsed = sendMessageDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const files = ((req as any).files as Express.Multer.File[] | undefined) ?? [];
  const message = await svc.sendMessage(req.params.id, (req as any).userId, parsed.data.body, files);
  res.status(201).json(ok(message));
}

export async function markThreadRead(req: Request, res: Response) {
  await svc.assertParticipant(req.params.id, (req as any).userId);
  await svc.markThreadRead(req.params.id, (req as any).userId);
  res.status(204).send();
}
