import { createPublicKey, type KeyObject } from "crypto";
import jwt from "jsonwebtoken";
import { AppError, UnauthorizedError } from "@poramma/utils";

/**
 * Vérification d'un « ID token » Google (Google Identity Services).
 *
 * Le navigateur obtient le jeton directement de Google et nous l'envoie ; rien de ce qu'il affirme
 * n'est cru sans contrôle de signature. Contrôles, dans l'ordre :
 *   - signature RS256 avec une clé publique de Google (JWKS), algorithme IMPOSÉ (jamais `none`/HS256) ;
 *   - `aud` = notre identifiant client (un jeton émis pour une autre application est refusé) ;
 *   - `iss` = Google, `exp` non dépassé ;
 *   - jeton récent (`iat` < 10 min) : réduit la fenêtre de rejeu d'un jeton intercepté ;
 *   - `email` présent ET `email_verified` : on ne rattache jamais un compte à une adresse non prouvée.
 *
 * Configuration : GOOGLE_CLIENT_ID (un ou plusieurs identifiants séparés par des virgules).
 * GOOGLE_JWKS_URL ne sert qu'aux tests (serveur de clés local) ; par défaut, les clés de Google.
 */

const DEFAULT_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const MAX_TOKEN_AGE_SECONDS = 10 * 60;
const MIN_REFETCH_MS = 60_000;

export interface GoogleIdentity {
  sub: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  picture: string | null;
}

/** Identifiants client acceptés ; vide = la connexion Google n'est pas configurée. */
export function googleClientIds(): string[] {
  return (process.env.GOOGLE_CLIENT_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isGoogleConfigured(): boolean {
  return googleClientIds().length > 0;
}

// ── Clés publiques (JWKS) ────────────────────────────────────────────────

let keys = new Map<string, KeyObject>();
let keysExpireAt = 0;
let lastFetchAt = 0;
let inflight: Promise<void> | null = null;

async function refreshKeys(): Promise<void> {
  // Une seule récupération à la fois, et jamais plus d'une par minute : un jeton à `kid` inconnu
  // forgé en boucle ne doit pas transformer ce service en client HTTP de Google.
  if (inflight) return inflight;
  if (Date.now() - lastFetchAt < MIN_REFETCH_MS && keys.size > 0) return;
  inflight = (async () => {
    lastFetchAt = Date.now();
    const res = await fetch(process.env.GOOGLE_JWKS_URL || DEFAULT_JWKS_URL, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`JWKS HTTP ${res.status}`);
    const body = (await res.json()) as { keys?: Array<Record<string, string>> };
    const next = new Map<string, KeyObject>();
    for (const jwk of body.keys ?? []) {
      if (jwk.kid && jwk.kty === "RSA") next.set(jwk.kid, createPublicKey({ key: jwk as any, format: "jwk" }));
    }
    if (next.size === 0) throw new Error("JWKS vide");
    keys = next;
    const maxAge = /max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1];
    keysExpireAt = Date.now() + (maxAge ? Number(maxAge) * 1000 : 60 * 60 * 1000);
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function keyFor(kid: string): Promise<KeyObject | undefined> {
  if (Date.now() >= keysExpireAt || !keys.has(kid)) await refreshKeys();
  return keys.get(kid);
}

/** Pour les tests : oublie les clés en cache. */
export function resetGoogleKeyCache() {
  keys = new Map();
  keysExpireAt = 0;
  lastFetchAt = 0;
}

// ── Vérification ─────────────────────────────────────────────────────────

const invalid = () => new UnauthorizedError("Connexion Google refusée : jeton invalide ou expiré. Réessayez.");

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  const audiences = googleClientIds();
  if (audiences.length === 0) {
    throw new AppError(503, "SERVICE_UNAVAILABLE", "La connexion avec Google n'est pas disponible pour le moment.");
  }
  if (typeof idToken !== "string" || idToken.length < 20 || idToken.length > 4096) throw invalid();

  const decoded = jwt.decode(idToken, { complete: true });
  const header = decoded && typeof decoded !== "string" ? decoded.header : null;
  if (!header || header.alg !== "RS256" || !header.kid) throw invalid();

  let key: KeyObject | undefined;
  try {
    key = await keyFor(header.kid);
  } catch {
    // Les clés de Google sont injoignables : ce n'est pas la faute de l'utilisateur.
    throw new AppError(503, "SERVICE_UNAVAILABLE", "La connexion avec Google est momentanément indisponible. Réessayez dans un instant.");
  }
  if (!key) throw invalid();

  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(idToken, key, {
      algorithms: ["RS256"],
      audience: audiences as [string, ...string[]],
      issuer: ISSUERS as [string, ...string[]],
      clockTolerance: 30,
    }) as jwt.JwtPayload;
  } catch {
    throw invalid();
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.iat !== "number" || now - payload.iat > MAX_TOKEN_AGE_SECONDS) throw invalid();

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  // Google envoie un booléen ; certains jetons de test une chaîne.
  const verified = payload.email_verified === true || payload.email_verified === "true";
  if (!payload.sub || !email || !verified) {
    throw new UnauthorizedError("Votre adresse email Google n'est pas vérifiée : impossible de l'utiliser pour vous connecter.");
  }

  return {
    sub: String(payload.sub),
    email,
    firstName: typeof payload.given_name === "string" ? payload.given_name.trim().slice(0, 255) || null : null,
    lastName: typeof payload.family_name === "string" ? payload.family_name.trim().slice(0, 255) || null : null,
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}
