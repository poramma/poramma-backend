import { z } from "zod";
export * as communityServicesDto from "./community/services";
export * as communityDocumentsDto from "./community/documents";
export * as communityDemandesDto from "./community/demandes";
export * as communityRendezVousDto from "./community/rendezvous";
export * as communityCampagnesDto from "./community/campagnes";
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
export declare const paginationMetaSchema: z.ZodObject<{
    page: z.ZodNumber;
    limit: z.ZodNumber;
    total: z.ZodNumber;
    totalPages: z.ZodNumber;
    hasNext: z.ZodBoolean;
    hasPrev: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}, {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}>;
export declare function apiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T): z.ZodObject<{
    success: z.ZodBoolean;
    data: T;
    message: z.ZodNullable<z.ZodString>;
    meta: z.ZodOptional<z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasNext: z.ZodBoolean;
        hasPrev: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }, {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>>;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodBoolean;
    data: T;
    message: z.ZodNullable<z.ZodString>;
    meta: z.ZodOptional<z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasNext: z.ZodBoolean;
        hasPrev: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }, {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>>;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    success: z.ZodBoolean;
    data: T;
    message: z.ZodNullable<z.ZodString>;
    meta: z.ZodOptional<z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
        hasNext: z.ZodBoolean;
        hasPrev: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }, {
        limit: number;
        page: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    }>>;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
export declare const apiErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    details: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodArray<z.ZodString, "many">>>;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    code: string;
    message: string;
    details: Record<string, string[]> | null;
    timestamp: string;
}, {
    code: string;
    message: string;
    details: Record<string, string[]> | null;
    timestamp: string;
}>;
export declare function ok<T>(data: T, meta?: PaginationMeta, message?: string | null): ApiResponse<T>;
export declare function fail(code: string, message: string, details?: Record<string, string[]> | null): ApiError;
export declare function paginationMeta(page: number, limit: number, total: number): PaginationMeta;
//# sourceMappingURL=index.d.ts.map