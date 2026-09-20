import { z } from "zod";
export declare const uploadDocumentDto: z.ZodObject<{
    type: z.ZodEnum<["ID_CARD", "PASSPORT", "STUDENT_CERT", "CONSULAR_CARD", "STUDENT_CARD", "PHOTO", "PROOF_ADDRESS", "BIRTH_CERT", "NATIONALITY_CERT", "SCHOLARSHIP_PROOF", "OTHER"]>;
    demandeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    requirementId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    type: "ID_CARD" | "PASSPORT" | "STUDENT_CERT" | "CONSULAR_CARD" | "STUDENT_CARD" | "PHOTO" | "PROOF_ADDRESS" | "BIRTH_CERT" | "NATIONALITY_CERT" | "SCHOLARSHIP_PROOF" | "OTHER";
    demandeId?: string | null | undefined;
    requirementId?: string | null | undefined;
}, {
    type: "ID_CARD" | "PASSPORT" | "STUDENT_CERT" | "CONSULAR_CARD" | "STUDENT_CARD" | "PHOTO" | "PROOF_ADDRESS" | "BIRTH_CERT" | "NATIONALITY_CERT" | "SCHOLARSHIP_PROOF" | "OTHER";
    demandeId?: string | null | undefined;
    requirementId?: string | null | undefined;
}>;
//# sourceMappingURL=documents.d.ts.map