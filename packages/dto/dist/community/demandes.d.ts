import { z } from "zod";
export declare const createDemandeDto: z.ZodObject<{
    subServiceId: z.ZodString;
    customPayload: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    documents: z.ZodOptional<z.ZodArray<z.ZodObject<{
        requirementId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        documentId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        documentId: string;
        requirementId?: string | null | undefined;
    }, {
        documentId: string;
        requirementId?: string | null | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    subServiceId: string;
    customPayload?: Record<string, unknown> | null | undefined;
    documents?: {
        documentId: string;
        requirementId?: string | null | undefined;
    }[] | undefined;
}, {
    subServiceId: string;
    customPayload?: Record<string, unknown> | null | undefined;
    documents?: {
        documentId: string;
        requirementId?: string | null | undefined;
    }[] | undefined;
}>;
export declare const addCommentDto: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
//# sourceMappingURL=demandes.d.ts.map