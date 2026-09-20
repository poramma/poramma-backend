import { Request, Response } from "express";
import { campagnesLogic } from "@poramma/ambassade-core";
import { communityCampagnesDto, ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";
import { db } from "../../db/connection";
import { toPublicCampagne } from "../../shared/public-mappers";
import { signMediaPath, verifyMediaToken } from "../../shared/media-token";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

const userIdOf = (req: Request) => (req as any).userId as string;

/** Préfixe public du service derrière le gateway (voir infra/nginx/nginx.conf). */
const PUBLIC_PREFIX = "/api/communaute";
const signFor = (userId: string) => (fileId: string) => `${PUBLIC_PREFIX}${signMediaPath(fileId, userId)}`;

/** GET /campagnes — fil d'annonces du citoyen (plus récentes d'abord). */
export async function listCampagnes(req: Request, res: Response) {
  const parsed = communityCampagnesDto.listCampagnesQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Paramètres invalides", zodDetails(parsed.error));

  const items = await campagnesLogic.listForUser(db, userIdOf(req), parsed.data);
  res.json(ok(items.map((i) => toPublicCampagne(i, signFor(userIdOf(req))))));
}

export async function getCampagne(req: Request, res: Response) {
  const item = await campagnesLogic.getForUser(db, userIdOf(req), req.params.id);
  res.json(ok(toPublicCampagne(item, signFor(userIdOf(req)))));
}

/** POST /campagnes/:id/view — ouverture du détail (comptée au plus une fois / 30 min / citoyen). */
export async function recordView(req: Request, res: Response) {
  res.json(ok(await campagnesLogic.recordView(db, { userId: userIdOf(req), campagneId: req.params.id })));
}

/** POST /campagnes/:id/click — clic sur un média, un document ou un lien. */
export async function recordClick(req: Request, res: Response) {
  const parsed = communityCampagnesDto.clickCampagneDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));
  await campagnesLogic.recordClick(db, { userId: userIdOf(req), campagneId: req.params.id, targetId: parsed.data.targetId });
  res.status(204).send();
}

/** POST /campagnes/:id/reactions/:type — bascule « j'aime » / « je participe ». */
export async function toggleReaction(req: Request, res: Response) {
  const type = communityCampagnesDto.reactionTypeDto.safeParse(req.params.type);
  if (!type.success) throw new ValidationError("Réaction inconnue", { type: ["LIKE | PARTICIPATE"] });
  res.json(ok(await campagnesLogic.toggleReaction(db, { userId: userIdOf(req), campagneId: req.params.id, type: type.data })));
}

/**
 * GET /campagnes/media/:fileId — média d'une annonce, authentifié par URL signée
 * (voir shared/media-token.ts), avec prise en charge des requêtes `Range`
 * (lecture et avance rapide des vidéos) et diffusion en flux.
 */
export async function streamMedia(req: Request, res: Response) {
  const fileId = req.params.fileId;
  const userId = verifyMediaToken(fileId, req.query);
  if (!userId) {
    res.status(403).json({ code: "FORBIDDEN", message: "Lien de média invalide ou expiré. Rechargez la page." });
    return;
  }

  const file = await campagnesLogic.getMediaFile(db, userId, fileId);
  const range = typeof req.headers.range === "string" ? req.headers.range : undefined;

  let object;
  try {
    object = await campagnesLogic.openMediaStream(file, range);
  } catch (err: any) {
    if (err?.name === "InvalidRange" || err?.$metadata?.httpStatusCode === 416) {
      res.status(416).setHeader("Content-Range", `bytes */${file.size}`).end();
      return;
    }
    throw err;
  }

  const inlineTypes = /^(image\/|video\/|application\/pdf)/;
  const asAttachment = req.query.download === "1" || !inlineTypes.test(file.mimeType);

  res.status(object.contentRange ? 206 : 200);
  res.setHeader("Content-Type", file.mimeType);
  if (object.contentLength != null) res.setHeader("Content-Length", String(object.contentLength));
  if (object.contentRange) res.setHeader("Content-Range", object.contentRange);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Ce contenu est un fichier, jamais une page : aucune exécution de script même s'il était détourné.
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.setHeader("Content-Disposition", `${asAttachment ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.originalName)}`);

  object.stream.on("error", () => res.destroy());
  req.on("close", () => object.stream.destroy());
  object.stream.pipe(res);
}
