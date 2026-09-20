import { z } from "zod";
export declare const createCategoryDto: z.ZodObject<{
    name: z.ZodString;
    code: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    allowedTypes: z.ZodArray<z.ZodEnum<["ID_CARD", "PASSPORT", "STUDENT_CERT", "CONSULAR_CARD", "STUDENT_CARD", "PHOTO", "PROOF_ADDRESS", "BIRTH_CERT", "NATIONALITY_CERT", "SCHOLARSHIP_PROOF", "OTHER"]>, "many">;
    requiresValidation: z.ZodOptional<z.ZodBoolean>;
    maxVersions: z.ZodOptional<z.ZodNumber>;
    retentionDays: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    code: string;
    allowedTypes: ("PHOTO" | "OTHER" | "ID_CARD" | "PASSPORT" | "STUDENT_CERT" | "CONSULAR_CARD" | "STUDENT_CARD" | "PROOF_ADDRESS" | "BIRTH_CERT" | "NATIONALITY_CERT" | "SCHOLARSHIP_PROOF")[];
    description?: string | null | undefined;
    requiresValidation?: boolean | undefined;
    maxVersions?: number | undefined;
    retentionDays?: number | null | undefined;
}, {
    name: string;
    code: string;
    allowedTypes: ("PHOTO" | "OTHER" | "ID_CARD" | "PASSPORT" | "STUDENT_CERT" | "CONSULAR_CARD" | "STUDENT_CARD" | "PROOF_ADDRESS" | "BIRTH_CERT" | "NATIONALITY_CERT" | "SCHOLARSHIP_PROOF")[];
    description?: string | null | undefined;
    requiresValidation?: boolean | undefined;
    maxVersions?: number | undefined;
    retentionDays?: number | null | undefined;
}>;
export declare const updateCategoryDto: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    allowedTypes: z.ZodOptional<z.ZodArray<z.ZodEnum<["ID_CARD", "PASSPORT", "STUDENT_CERT", "CONSULAR_CARD", "STUDENT_CARD", "PHOTO", "PROOF_ADDRESS", "BIRTH_CERT", "NATIONALITY_CERT", "SCHOLARSHIP_PROOF", "OTHER"]>, "many">>;
    requiresValidation: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    maxVersions: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    retentionDays: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    code?: string | undefined;
    description?: string | null | undefined;
    allowedTypes?: ("PHOTO" | "OTHER" | "ID_CARD" | "PASSPORT" | "STUDENT_CERT" | "CONSULAR_CARD" | "STUDENT_CARD" | "PROOF_ADDRESS" | "BIRTH_CERT" | "NATIONALITY_CERT" | "SCHOLARSHIP_PROOF")[] | undefined;
    requiresValidation?: boolean | undefined;
    maxVersions?: number | undefined;
    retentionDays?: number | null | undefined;
}, {
    name?: string | undefined;
    code?: string | undefined;
    description?: string | null | undefined;
    allowedTypes?: ("PHOTO" | "OTHER" | "ID_CARD" | "PASSPORT" | "STUDENT_CERT" | "CONSULAR_CARD" | "STUDENT_CARD" | "PROOF_ADDRESS" | "BIRTH_CERT" | "NATIONALITY_CERT" | "SCHOLARSHIP_PROOF")[] | undefined;
    requiresValidation?: boolean | undefined;
    maxVersions?: number | undefined;
    retentionDays?: number | null | undefined;
}>;
export declare const listDocumentsQueryDto: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["UPLOADED", "IN_REVIEW", "ACCEPTED", "REJECTED", "EXPIRED"]>>;
    type: z.ZodOptional<z.ZodEnum<["ID_CARD", "PASSPORT", "STUDENT_CERT", "CONSULAR_CARD", "STUDENT_CARD", "PHOTO", "PROOF_ADDRESS", "BIRTH_CERT", "NATIONALITY_CERT", "SCHOLARSHIP_PROOF", "OTHER"]>>;
    categoryId: z.ZodOptional<z.ZodString>;
    ownerUserId: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
    type?: "PHOTO" | "OTHER" | "ID_CARD" | "PASSPORT" | "STUDENT_CERT" | "CONSULAR_CARD" | "STUDENT_CARD" | "PROOF_ADDRESS" | "BIRTH_CERT" | "NATIONALITY_CERT" | "SCHOLARSHIP_PROOF" | undefined;
    status?: "REJECTED" | "IN_REVIEW" | "ACCEPTED" | "UPLOADED" | "EXPIRED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    ownerUserId?: string | undefined;
    categoryId?: string | undefined;
}, {
    search?: string | undefined;
    type?: "PHOTO" | "OTHER" | "ID_CARD" | "PASSPORT" | "STUDENT_CERT" | "CONSULAR_CARD" | "STUDENT_CARD" | "PROOF_ADDRESS" | "BIRTH_CERT" | "NATIONALITY_CERT" | "SCHOLARSHIP_PROOF" | undefined;
    status?: "REJECTED" | "IN_REVIEW" | "ACCEPTED" | "UPLOADED" | "EXPIRED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    ownerUserId?: string | undefined;
    categoryId?: string | undefined;
}>;
export declare const uploadDocumentDto: z.ZodObject<{
    type: z.ZodEnum<["ID_CARD", "PASSPORT", "STUDENT_CERT", "CONSULAR_CARD", "STUDENT_CARD", "PHOTO", "PROOF_ADDRESS", "BIRTH_CERT", "NATIONALITY_CERT", "SCHOLARSHIP_PROOF", "OTHER"]>;
    ownerUserId: z.ZodString;
    categoryId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    expiryDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    demandeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    requirementId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "PHOTO" | "OTHER" | "ID_CARD" | "PASSPORT" | "STUDENT_CERT" | "CONSULAR_CARD" | "STUDENT_CARD" | "PROOF_ADDRESS" | "BIRTH_CERT" | "NATIONALITY_CERT" | "SCHOLARSHIP_PROOF";
    ownerUserId: string;
    demandeId?: string | null | undefined;
    requirementId?: string | null | undefined;
    notes?: string | null | undefined;
    categoryId?: string | null | undefined;
    expiryDate?: string | null | undefined;
}, {
    type: "PHOTO" | "OTHER" | "ID_CARD" | "PASSPORT" | "STUDENT_CERT" | "CONSULAR_CARD" | "STUDENT_CARD" | "PROOF_ADDRESS" | "BIRTH_CERT" | "NATIONALITY_CERT" | "SCHOLARSHIP_PROOF";
    ownerUserId: string;
    demandeId?: string | null | undefined;
    requirementId?: string | null | undefined;
    notes?: string | null | undefined;
    categoryId?: string | null | undefined;
    expiryDate?: string | null | undefined;
}>;
export declare const validateDocumentDto: z.ZodObject<{
    status: z.ZodEnum<["ACCEPTED", "REJECTED"]>;
    reviewNote: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "REJECTED" | "ACCEPTED";
    reviewNote?: string | undefined;
}, {
    status: "REJECTED" | "ACCEPTED";
    reviewNote?: string | undefined;
}>;
export declare const auditQueryDto: z.ZodObject<{
    documentId: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    documentId?: string | undefined;
    limit?: number | undefined;
}, {
    documentId?: string | undefined;
    limit?: number | undefined;
}>;
//# sourceMappingURL=dto.d.ts.map