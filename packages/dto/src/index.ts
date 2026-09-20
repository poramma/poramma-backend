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
