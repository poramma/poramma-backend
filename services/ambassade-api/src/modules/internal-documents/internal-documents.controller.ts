import { Request, Response } from "express";
import multer from "multer";
import * as svc from "./internal-documents.service";
import { listInternalDocumentsQueryDto, createInternalDocumentDto, shareInternalDocumentDto } from "./dto";
import { ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
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
  return {
    userId: (req as any).userId as string,
    roleId: (req as any).roleId as string | null,
    roleName: (req as any).roleName as string | null,
  };
}

function userAgentOf(req: Request): string | null {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : null;
}

export async function listInternalDocuments(req: Request, res: Response) {
  const parsed = listInternalDocumentsQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  res.json(ok(await svc.listInternalDocuments(actorOf(req), parsed.data)));
}

export async function getInternalDocument(req: Request, res: Response) {
  res.json(ok(await svc.getInternalDocument(req.params.id, actorOf(req))));
}

export async function createInternalDocument(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ValidationError("Fichier requis", { file: ["Required"] });

  const parsed = createInternalDocumentDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const doc = await svc.createInternalDocument(
    file.buffer,
    file.originalname,
    file.mimetype,
    parsed.data,
    actorOf(req),
    req.ip,
    userAgentOf(req)
  );
  res.status(201).json(ok(doc));
}

export async function shareInternalDocument(req: Request, res: Response) {
  const parsed = shareInternalDocumentDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(await svc.shareInternalDocument(req.params.id, parsed.data, actorOf(req))));
}

export async function downloadInternalDocument(req: Request, res: Response) {
  const { buffer, contentType, filename } = await svc.downloadInternalDocument(req.params.id, actorOf(req), req.ip, userAgentOf(req));
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
}
