import { Request, Response } from "express";
import multer from "multer";
import { documentsLogic, demandesLogic } from "@poramma/ambassade-core";
import { communityDocumentsDto, ok } from "@poramma/dto";
import { ValidationError, ForbiddenError } from "@poramma/utils";
import { db } from "../../db/connection";
import { toPublicDocument } from "../../shared/public-mappers";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
  return { userId: (req as any).userId as string, roleName: null };
}

function userAgentOf(req: Request): string | null {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : null;
}

/** Un membre de la communauté ne peut accéder qu'à ses propres documents — pas de rôle staff ici. */
async function assertOwner(req: Request, documentId: string): Promise<void> {
  const ownerId = await documentsLogic.getDocumentOwnerId(db, documentId);
  if (ownerId !== (req as any).userId) throw new ForbiddenError("Accès non autorisé à ce document");
}

export async function listMyDocuments(req: Request, res: Response) {
  const docs = await documentsLogic.listDocuments(db, { ownerUserId: (req as any).userId, limit: 200 });
  res.json(ok(docs.map(toPublicDocument)));
}

export async function getDocument(req: Request, res: Response) {
  await assertOwner(req, req.params.id);
  const doc = await documentsLogic.getDocument(db, req.params.id);
  res.json(ok(toPublicDocument(doc)));
}

export async function uploadDocument(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ValidationError("Fichier requis", { file: ["Required"] });

  const parsed = communityDocumentsDto.uploadDocumentDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  // Un document ne peut être rattaché qu'à SON propre dossier.
  if (parsed.data.demandeId) await demandesLogic.getOwnedDemande(db, parsed.data.demandeId, (req as any).userId);

  const doc = await documentsLogic.uploadDocument(
    db,
    file.buffer,
    file.originalname,
    file.mimetype,
    { ...parsed.data, ownerUserId: (req as any).userId },
    actorOf(req),
    req.ip,
    userAgentOf(req)
  );
  res.status(201).json(ok(toPublicDocument(doc)));
}

export async function downloadDocument(req: Request, res: Response) {
  await assertOwner(req, req.params.id);
  const { buffer, contentType, filename } = await documentsLogic.downloadDocument(db, req.params.id, actorOf(req), req.ip, userAgentOf(req));
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
}

export async function deleteDocument(req: Request, res: Response) {
  await assertOwner(req, req.params.id);
  await documentsLogic.deleteDocument(db, req.params.id, actorOf(req));
  res.status(204).send();
}
