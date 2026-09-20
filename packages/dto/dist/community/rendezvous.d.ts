import { z } from "zod";
export declare const slotsQueryDto: z.ZodObject<{
    subServiceId: z.ZodString;
    date: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
    subServiceId: string;
}, {
    date: string;
    subServiceId: string;
}>;
export declare const availableDatesQueryDto: z.ZodObject<{
    subServiceId: z.ZodString;
    days: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    subServiceId: string;
    days?: number | undefined;
}, {
    subServiceId: string;
    days?: number | undefined;
}>;
export declare const bookRendezVousDto: z.ZodObject<{
    subServiceId: z.ZodString;
    date: z.ZodString;
    startTime: z.ZodString;
    motif: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    demandeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    date: string;
    subServiceId: string;
    startTime: string;
    demandeId?: string | null | undefined;
    motif?: string | null | undefined;
}, {
    date: string;
    subServiceId: string;
    startTime: string;
    demandeId?: string | null | undefined;
    motif?: string | null | undefined;
}>;
export declare const rescheduleRendezVousDto: z.ZodObject<{
    date: z.ZodString;
    startTime: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
    startTime: string;
}, {
    date: string;
    startTime: string;
}>;
export declare const cancelRendezVousDto: z.ZodObject<{
    reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    reason?: string | null | undefined;
}, {
    reason?: string | null | undefined;
}>;
export declare const addRendezVousNoteDto: z.ZodObject<{
    content: z.ZodString;
}, "strip", z.ZodTypeAny, {
    content: string;
}, {
    content: string;
}>;
//# sourceMappingURL=rendezvous.d.ts.map