import { z } from "zod";
export declare const listEtudiantsQueryDto: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["PENDING", "VALIDATED", "REJECTED", "SUSPENDED"]>>;
    city: z.ZodOptional<z.ZodString>;
    university: z.ZodOptional<z.ZodString>;
    faculty: z.ZodOptional<z.ZodString>;
    studyLevel: z.ZodOptional<z.ZodString>;
    hasBourse: z.ZodOptional<z.ZodBoolean>;
    hasInue: z.ZodOptional<z.ZodBoolean>;
    page: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
    sortBy: z.ZodOptional<z.ZodEnum<["name", "registeredAt", "status"]>>;
    sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
    status?: "REJECTED" | "PENDING" | "SUSPENDED" | "VALIDATED" | undefined;
    city?: string | undefined;
    limit?: number | undefined;
    university?: string | undefined;
    faculty?: string | undefined;
    studyLevel?: string | undefined;
    page?: number | undefined;
    hasBourse?: boolean | undefined;
    hasInue?: boolean | undefined;
    sortBy?: "name" | "status" | "registeredAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}, {
    search?: string | undefined;
    status?: "REJECTED" | "PENDING" | "SUSPENDED" | "VALIDATED" | undefined;
    city?: string | undefined;
    limit?: number | undefined;
    university?: string | undefined;
    faculty?: string | undefined;
    studyLevel?: string | undefined;
    page?: number | undefined;
    hasBourse?: boolean | undefined;
    hasInue?: boolean | undefined;
    sortBy?: "name" | "status" | "registeredAt" | undefined;
    sortOrder?: "asc" | "desc" | undefined;
}>;
export declare const searchEtudiantsQueryDto: z.ZodObject<{
    q: z.ZodString;
}, "strip", z.ZodTypeAny, {
    q: string;
}, {
    q: string;
}>;
export declare const validateEtudiantDto: z.ZodObject<{
    comment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    comment?: string | undefined;
}, {
    comment?: string | undefined;
}>;
export declare const rejectEtudiantDto: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const suspendEtudiantDto: z.ZodObject<{
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
}, {
    reason: string;
}>;
export declare const estimateEtudiantsDto: z.ZodObject<{
    city: z.ZodOptional<z.ZodString>;
    university: z.ZodOptional<z.ZodString>;
    faculty: z.ZodOptional<z.ZodString>;
    studyLevel: z.ZodOptional<z.ZodString>;
    hasBourse: z.ZodOptional<z.ZodBoolean>;
    status: z.ZodOptional<z.ZodEnum<["PENDING", "VALIDATED", "REJECTED", "SUSPENDED"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "REJECTED" | "PENDING" | "SUSPENDED" | "VALIDATED" | undefined;
    city?: string | undefined;
    university?: string | undefined;
    faculty?: string | undefined;
    studyLevel?: string | undefined;
    hasBourse?: boolean | undefined;
}, {
    status?: "REJECTED" | "PENDING" | "SUSPENDED" | "VALIDATED" | undefined;
    city?: string | undefined;
    university?: string | undefined;
    faculty?: string | undefined;
    studyLevel?: string | undefined;
    hasBourse?: boolean | undefined;
}>;
//# sourceMappingURL=dto.d.ts.map