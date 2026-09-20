import { Request, Response } from "express";
import multer from "multer";
import * as svc from "./documents.service";
import { createCategoryDto, updateCategoryDto, listDocumentsQueryDto, uploadDocumentDto, validateDocumentDto, auditQueryDto } from "./dto";
import { ok } from "@poramma/dto";
import { ValidationError, ForbiddenError } from "@poramma/utils";

// 20MB covers both the 10MB (citizen documents) and 20MB (internal
// documents, Phase 7 follow-up) limits already enforced client-side.
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

function userAgentOf(req: Request): string | null {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : null;
}

function hasStaffReadAccess(req: Request): boolean {
  const permissions: string[] = (req as any).permissions || [];
  return permissions.includes("document:read");
}

/**
 * Même principe que demandes/rendez-vous (voir demandes.controller.ts) :
 * le staff avec document:read voit tout ; un propriétaire non-staff (le
 * citoyen lui-même, une fois frontend-community construit) ne peut accéder
 * qu'à SES PROPRES documents.
 */
async function assertCanAccessDocument(req: Request, documentId: string): Promise<void> {
  if (hasStaffReadAccess(req)) return;
  const ownerId = await svc.getDocumentOwnerId(documentId);
  if (ownerId !== (req as any).userId) throw new ForbiddenError("Accès non autorisé à ce document");
}

// ============================================================
// Categories
// ============================================================

export async function listCategories(req: Request, res: Response) {
  res.json(ok(await svc.listCategories()));
}

export async function createCategory(req: Request, res: Response) {
  const parsed = createCategoryDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.status(201).json(ok(await svc.createCategory(parsed.data)));
}

export async function updateCategory(req: Request, res: Response) {
  const parsed = updateCategoryDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(await svc.updateCategory(req.params.id, parsed.data)));
}

export async function deleteCategory(req: Request, res: Response) {
  await svc.deleteCategory(req.params.id);
  res.status(204).send();
}

// ============================================================
// Documents
// ============================================================

export async function listDocuments(req: Request, res: Response) {
  const parsed = listDocumentsQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  res.json(ok(await svc.listDocuments(parsed.data)));
}

export async function getDocument(req: Request, res: Response) {
  await assertCanAccessDocument(req, req.params.id);
  const doc = await svc.getDocument(req.params.id);
  await svc.logView(req.params.id, actorOf(req), req.ip, userAgentOf(req));
  res.json(ok(doc));
}

/**
 * Un caller staff (document:upload) peut uploader pour n'importe quel
 * ownerUserId. Un caller non-staff ne peut uploader QUE pour lui-même —
 * `ownerUserId` du body est ignoré/écrasé dans ce cas (jamais fait confiance
 * à une valeur client pour désigner un tiers).
 */
export async function uploadDocument(req: Request, res: Response) {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ValidationError("Fichier requis", { file: ["Required"] });

  const parsed = uploadDocumentDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const permissions: string[] = (req as any).permissions || [];
  const isStaffUploader = permissions.includes("document:upload");
  const ownerUserId = isStaffUploader ? parsed.data.ownerUserId : (req as any).userId;

  const doc = await svc.uploadDocument(
    file.buffer,
    file.originalname,
    file.mimetype,
    { ...parsed.data, ownerUserId },
    actorOf(req),
    req.ip,
    userAgentOf(req)
  );
  res.status(201).json(ok(doc));
}

export async function addVersion(req: Request, res: Response) {
  await assertCanAccessDocument(req, req.params.id);

  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw new ValidationError("Fichier requis", { file: ["Required"] });

  const changeNote = typeof req.body.changeNote === "string" ? req.body.changeNote : undefined;
  const doc = await svc.addDocumentVersion(req.params.id, file.buffer, file.originalname, file.mimetype, changeNote, actorOf(req));
  res.status(201).json(ok(doc));
}

export async function listVersions(req: Request, res: Response) {
  await assertCanAccessDocument(req, req.params.id);
  res.json(ok(await svc.listVersions(req.params.id)));
}

export async function downloadDocument(req: Request, res: Response) {
  await assertCanAccessDocument(req, req.params.id);
  const { buffer, contentType, filename } = await svc.downloadDocument(req.params.id, actorOf(req), req.ip, userAgentOf(req));
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  res.send(buffer);
}

export async function validateDocument(req: Request, res: Response) {
  const parsed = validateDocumentDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(await svc.validateDocument(req.params.id, parsed.data.status, parsed.data.reviewNote, actorOf(req))));
}

export async function archiveDocument(req: Request, res: Response) {
  res.json(ok(await svc.archiveDocument(req.params.id, actorOf(req))));
}

export async function getStats(req: Request, res: Response) {
  res.json(ok(await svc.getStats()));
}

export async function listAudit(req: Request, res: Response) {
  const parsed = auditQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  res.json(ok(await svc.listAudit(parsed.data.documentId, parsed.data.limit ?? 50)));
}
