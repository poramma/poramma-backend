import { z } from "zod";
export declare const listInternalDocumentsQueryDto: z.ZodObject<{
    department: z.ZodOptional<z.ZodString>;
    confidentiality: z.ZodOptional<z.ZodEnum<["PUBLIC", "INTERNAL", "RESTRICTED", "CONFIDENTIAL"]>>;
    search: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
    department?: string | undefined;
    confidentiality?: "INTERNAL" | "PUBLIC" | "RESTRICTED" | "CONFIDENTIAL" | undefined;
}, {
    search?: string | undefined;
    department?: string | undefined;
    confidentiality?: "INTERNAL" | "PUBLIC" | "RESTRICTED" | "CONFIDENTIAL" | undefined;
}>;
export declare const createInternalDocumentDto: z.ZodObject<{
    title: z.ZodString;
    department: z.ZodString;
    confidentiality: z.ZodEnum<["PUBLIC", "INTERNAL", "RESTRICTED", "CONFIDENTIAL"]>;
    tags: z.ZodEffects<z.ZodOptional<z.ZodString>, string[], string | undefined>;
}, "strip", z.ZodTypeAny, {
    department: string;
    title: string;
    confidentiality: "INTERNAL" | "PUBLIC" | "RESTRICTED" | "CONFIDENTIAL";
    tags: string[];
}, {
    department: string;
    title: string;
    confidentiality: "INTERNAL" | "PUBLIC" | "RESTRICTED" | "CONFIDENTIAL";
    tags?: string | undefined;
}>;
export declare const shareInternalDocumentDto: z.ZodObject<{
    targetAgentIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    targetRoleIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    targetRoleIds: string[];
    targetAgentIds: string[];
}, {
    targetRoleIds?: string[] | undefined;
    targetAgentIds?: string[] | undefined;
}>;
//# sourceMappingURL=dto.d.ts.map