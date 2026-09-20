import type { NextFunction, Request, Response } from "express";
import { ApiError } from "@poramma/dto";
export type ErrorDetails = Record<string, string[]> | null;
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): (req: Request, res: Response, next: NextFunction) => void;
export declare class AppError extends Error {
    readonly httpStatus: number;
    readonly code: string;
    readonly details: ErrorDetails;
    constructor(httpStatus: number, code: string, message: string, details?: ErrorDetails);
    toApiError(): ApiError;
}
export declare class BadRequestError extends AppError {
    constructor(message?: string, details?: ErrorDetails);
}
export declare class UnauthorizedError extends AppError {
    constructor(message?: string, details?: ErrorDetails);
}
export declare class ForbiddenError extends AppError {
    constructor(message?: string, details?: ErrorDetails);
}
export declare class NotFoundError extends AppError {
    constructor(message?: string, details?: ErrorDetails);
}
export declare class ConflictError extends AppError {
    constructor(message?: string, details?: ErrorDetails);
}
export declare class ValidationError extends AppError {
    constructor(message?: string, details?: ErrorDetails);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string, details?: ErrorDetails);
}
export declare function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void;
export declare function requireEnv(name: string): string;
export * from "./audit-trail";
//# sourceMappingURL=index.d.ts.map