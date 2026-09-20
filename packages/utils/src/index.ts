import type { NextFunction, Request, Response } from "express";
import { ApiError, fail } from "@poramma/dto";

/**
 * Shared error types and the Express error-handling middleware used by every
 * service. Responses always follow the `ApiError` shape from @poramma/dto.
 */

export type ErrorDetails = Record<string, string[]> | null;

/**
 * Wraps an async Express handler so a rejected promise (including a thrown
 * AppError) reaches the error-handling middleware via `next(err)`. Express 4
 * only auto-catches SYNCHRONOUS throws in handlers — a `throw` inside an
 * `async function` produces a rejected promise that Express otherwise never
 * sees, leaving the request hanging.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}

/** Base class for every error that maps to a deliberate HTTP response. */
export class AppError extends Error {
  readonly httpStatus: number;
  readonly code: string;
  readonly details: ErrorDetails;

  constructor(
    httpStatus: number,
    code: string,
    message: string,
    details: ErrorDetails = null
  ) {
    super(message);
    this.name = new.target.name;
    this.httpStatus = httpStatus;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }

  /** Renders this error as the wire format the frontend expects. */
  toApiError(): ApiError {
    return fail(this.code, this.message, this.details);
  }
}

/** 400 — the request itself could not be understood (malformed JSON, ...). */
export class BadRequestError extends AppError {
  constructor(message = "Requête invalide", details: ErrorDetails = null) {
    super(400, "BAD_REQUEST", message, details);
  }
}

/** 401 — no credentials, or credentials that are not valid. */
export class UnauthorizedError extends AppError {
  constructor(message = "Non authentifié", details: ErrorDetails = null) {
    super(401, "UNAUTHORIZED", message, details);
  }
}

/** 403 — authenticated, but not allowed to perform this action. */
export class ForbiddenError extends AppError {
  constructor(message = "Accès refusé", details: ErrorDetails = null) {
    super(403, "FORBIDDEN", message, details);
  }
}

/** 404 — the addressed resource does not exist. */
export class NotFoundError extends AppError {
  constructor(message = "Ressource introuvable", details: ErrorDetails = null) {
    super(404, "NOT_FOUND", message, details);
  }
}

/** 409 — the request conflicts with the current state (duplicate, ...). */
export class ConflictError extends AppError {
  constructor(message = "Conflit avec l’état actuel", details: ErrorDetails = null) {
    super(409, "CONFLICT", message, details);
  }
}

/** 422 — well-formed request whose contents fail validation. */
export class ValidationError extends AppError {
  constructor(message = "Données invalides", details: ErrorDetails = null) {
    super(422, "VALIDATION_ERROR", message, details);
  }
}

/** 429 — too many requests. */
export class RateLimitError extends AppError {
  constructor(message = "Trop de requêtes", details: ErrorDetails = null) {
    super(429, "RATE_LIMIT_EXCEEDED", message, details);
  }
}

/** Shape of a Zod error, matched structurally so utils needs no zod dependency. */
interface ZodLikeError {
  name: string;
  issues: Array<{ path: Array<string | number>; message: string }>;
}

function isZodError(err: unknown): err is ZodLikeError {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as ZodLikeError).name === "ZodError" &&
    Array.isArray((err as ZodLikeError).issues)
  );
}

/** Groups Zod issues into the `Record<string, string[]>` details format. */
function zodIssuesToDetails(issues: ZodLikeError["issues"]): ErrorDetails {
  const details: Record<string, string[]> = {};
  for (const issue of issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_";
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

/** True for body-parser's "could not parse the JSON body" failure. */
function isBodyParseError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { type?: string }).type === "entity.parse.failed"
  );
}

/** Normalizes any thrown value into an AppError. */
function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (isZodError(err)) {
    return new ValidationError("Données invalides", zodIssuesToDetails(err.issues));
  }
  if (isBodyParseError(err)) {
    return new BadRequestError("Corps de requête JSON invalide");
  }
  // Anything else is an unexpected failure: never surface its message, which
  // may carry DB/driver internals. Log it server-side instead.
  return new AppError(500, "INTERNAL_ERROR", "Une erreur interne est survenue");
}

/**
 * Express error-handling middleware. Must be registered as the LAST
 * `app.use(...)` of an application, after all routes.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Headers already flushed: only Express can finish this response.
  if (res.headersSent) {
    next(err);
    return;
  }

  const appError = toAppError(err);

  if (appError.httpStatus >= 500) {
    console.error(`[${req.method} ${req.originalUrl}] Unhandled error:`, err);
  } else {
    console.warn(
      `[${req.method} ${req.originalUrl}] ${appError.httpStatus} ${appError.code}: ${appError.message}`
    );
  }

  res.status(appError.httpStatus).json(appError.toApiError());
}

/**
 * Reads a required environment variable, failing loudly at startup rather than
 * silently falling back to a value that points at the wrong infrastructure.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. Set it in the service .env file or in docker-compose.yml.`
    );
  }
  return value;
}

export * from "./audit-trail";
