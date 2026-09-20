import crypto from "crypto";

/**
 * URL de média signée. Les balises <img>/<video>/<a download> du navigateur ne
 * peuvent pas envoyer d'en-tête Authorization : l'URL porte donc elle-même une
 * preuve d'accès (HMAC) liée au fichier ET au citoyen, valable quelques heures.
 * Le serveur revérifie en plus, à chaque requête, que le citoyen a le droit de
 * voir l'annonce qui contient ce fichier (campagnesLogic.getMediaFile).
 */
const TTL_SECONDS = 6 * 3600;

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET manquant : impossible de signer les URLs de média");
  return s;
}

function mac(fileId: string, userId: string, expires: number): string {
  return crypto.createHmac("sha256", secret()).update(`${fileId}.${userId}.${expires}`).digest("base64url");
}

/** Chemin (relatif au préfixe /api/communaute) d'un média signé pour ce citoyen. */
export function signMediaPath(fileId: string, userId: string): string {
  const expires = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  return `/campagnes/media/${encodeURIComponent(fileId)}?u=${userId}&e=${expires}&s=${mac(fileId, userId, expires)}`;
}

/** Vérifie signature et expiration ; renvoie l'id du citoyen concerné ou `null`. */
export function verifyMediaToken(fileId: string, query: { u?: unknown; e?: unknown; s?: unknown }): string | null {
  const userId = typeof query.u === "string" ? query.u : "";
  const expires = Number(query.e);
  const sig = typeof query.s === "string" ? query.s : "";
  if (!userId || !Number.isFinite(expires) || !sig) return null;
  if (expires < Math.floor(Date.now() / 1000)) return null;

  const expected = Buffer.from(mac(fileId, userId, expires));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return userId;
}
