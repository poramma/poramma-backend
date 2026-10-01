import { z } from "zod";

export * as communityServicesDto from "./community/services";
export * as communityDocumentsDto from "./community/documents";
export * as communityDemandesDto from "./community/demandes";
export * as communityRendezVousDto from "./community/rendezvous";
export * as communityCampagnesDto from "./community/campagnes";

/**
 * Shared API response envelope.
 *
 * These shapes mirror the frontend contract in poramma-frontend-ambassy's
 * `src/types/api.ts`, which is the source of truth. Field names and
 * optionality must stay in sync with that file.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string | null;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details: Record<string, string[]> | null;
  timestamp: string;
}

export const paginationMetaSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

/**
 * Builds a Zod schema for `ApiResponse<T>` around the schema of `data`.
 * Example: `apiResponseSchema(userSchema)`.
 */
export function apiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema,
    message: z.string().nullable(),
    meta: paginationMetaSchema.optional(),
  });
}

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.array(z.string())).nullable(),
  timestamp: z.string(),
});

/** Builds a successful response envelope. */
export function ok<T>(
  data: T,
  meta?: PaginationMeta,
  message: string | null = null
): ApiResponse<T> {
  const response: ApiResponse<T> = { success: true, data, message };
  if (meta) response.meta = meta;
  return response;
}

/** Builds an error payload. `timestamp` is always an ISO-8601 string. */
export function fail(
  code: string,
  message: string,
  details: Record<string, string[]> | null = null
): ApiError {
  return { code, message, details, timestamp: new Date().toISOString() };
}

/**
 * Computes a `PaginationMeta` from the raw page/limit/total triple, so the
 * derived fields are never calculated inconsistently across controllers.
 */
export function paginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Numéro de téléphone — l'ambassade du Mali au Maroc traite presque
 * exclusivement des numéros marocains ou maliens : on valide ces deux plans
 * de numérotation précisément (indicatif + longueur). Miroir de chaque
 * frontend's lib/phone.ts — les trois doivent rester synchronisés si la
 * règle change.
 */
const PHONE_SHAPE = /^\+?[\d\s()-]+$/;
// Maroc : +212 ou 0, puis 9 chiffres commençant par 5 (fixe), 6 ou 7 (mobile).
const MOROCCO_RE = /^(?:\+212|0)[5-7]\d{8}$/;
// Mali : +223 (facultatif, pas de préfixe national "0"), puis 8 chiffres commençant par 2 à 9.
const MALI_RE = /^(?:\+223)?[2-9]\d{7}$/;

function compactPhone(value: string): string {
  const trimmed = value.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^\d]/g, "");
}

function isMoroccoOrMaliPhone(value: string): boolean {
  const compact = compactPhone(value);
  return MOROCCO_RE.test(compact) || MALI_RE.test(compact);
}

const PHONE_FORMAT_MESSAGE =
  "Numéro invalide : format attendu Maroc (+212 6/7 puis 8 chiffres, ou 06/07…) ou Mali (+223 puis 8 chiffres)";

/** Optionnel : absent/vide accepté, sinon la forme est vérifiée. */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .refine((v) => v === "" || PHONE_SHAPE.test(v), "Le numéro ne doit contenir que des chiffres (espaces, tirets et + acceptés)")
  .refine((v) => v === "" || isMoroccoOrMaliPhone(v), PHONE_FORMAT_MESSAGE)
  .optional();

/** Obligatoire : le champ doit être renseigné ET avoir une forme valide. */
export const requiredPhoneSchema = z
  .string()
  .trim()
  .min(1, "Le numéro de téléphone est requis")
  .refine((v) => PHONE_SHAPE.test(v), "Le numéro ne doit contenir que des chiffres (espaces, tirets et + acceptés)")
  .refine((v) => isMoroccoOrMaliPhone(v), PHONE_FORMAT_MESSAGE);
