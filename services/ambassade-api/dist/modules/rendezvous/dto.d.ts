import { z } from "zod";
export declare const agendaSlotsQueryDto: z.ZodObject<{
    date: z.ZodString;
    subServiceId: z.ZodOptional<z.ZodString>;
    agentId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    date: string;
    subServiceId?: string | undefined;
    agentId?: string | undefined;
}, {
    date: string;
    subServiceId?: string | undefined;
    agentId?: string | undefined;
}>;
export declare const listRendezVousQueryDto: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
    agentId: z.ZodOptional<z.ZodString>;
    subServiceId: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "MISSED", "CANCELLED_BY_USER", "CANCELLED_BY_AGENT", "NO_SHOW"]>>;
    type: z.ZodOptional<z.ZodEnum<["STANDARD", "URGENCE", "PRIORITAIRE", "SUIVI"]>>;
    userId: z.ZodOptional<z.ZodString>;
    fromDate: z.ZodOptional<z.ZodString>;
    toDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    date?: string | undefined;
    subServiceId?: string | undefined;
    type?: "STANDARD" | "URGENCE" | "PRIORITAIRE" | "SUIVI" | undefined;
    status?: "COMPLETED" | "PENDING" | "CANCELLED_BY_USER" | "CANCELLED_BY_AGENT" | "NO_SHOW" | "CONFIRMED" | "CHECKED_IN" | "IN_PROGRESS" | "MISSED" | undefined;
    userId?: string | undefined;
    agentId?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}, {
    date?: string | undefined;
    subServiceId?: string | undefined;
    type?: "STANDARD" | "URGENCE" | "PRIORITAIRE" | "SUIVI" | undefined;
    status?: "COMPLETED" | "PENDING" | "CANCELLED_BY_USER" | "CANCELLED_BY_AGENT" | "NO_SHOW" | "CONFIRMED" | "CHECKED_IN" | "IN_PROGRESS" | "MISSED" | undefined;
    userId?: string | undefined;
    agentId?: string | undefined;
    fromDate?: string | undefined;
    toDate?: string | undefined;
}>;
export declare const createRendezVousDto: z.ZodObject<{
    userId: z.ZodString;
    subServiceId: z.ZodString;
    agentId: z.ZodOptional<z.ZodString>;
    slotId: z.ZodString;
    motif: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    demandeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    subServiceId: string;
    userId: string;
    slotId: string;
    demandeId?: string | null | undefined;
    agentId?: string | undefined;
    motif?: string | null | undefined;
}, {
    subServiceId: string;
    userId: string;
    slotId: string;
    demandeId?: string | null | undefined;
    agentId?: string | undefined;
    motif?: string | null | undefined;
}>;
export declare const createUrgenceDto: z.ZodObject<{
    userId: z.ZodString;
    subServiceId: z.ZodString;
    agentId: z.ZodString;
    motif: z.ZodString;
    urgenceJustification: z.ZodString;
    demandeId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    subServiceId: string;
    userId: string;
    agentId: string;
    motif: string;
    urgenceJustification: string;
    demandeId?: string | null | undefined;
}, {
    subServiceId: string;
    userId: string;
    agentId: string;
    motif: string;
    urgenceJustification: string;
    demandeId?: string | null | undefined;
}>;
export declare const updateStatusDto: z.ZodObject<{
    status: z.ZodEnum<["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED", "MISSED", "CANCELLED_BY_USER", "CANCELLED_BY_AGENT", "NO_SHOW"]>;
    comment: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "COMPLETED" | "PENDING" | "CANCELLED_BY_USER" | "CANCELLED_BY_AGENT" | "NO_SHOW" | "CONFIRMED" | "CHECKED_IN" | "IN_PROGRESS" | "MISSED";
    comment?: string | undefined;
}, {
    status: "COMPLETED" | "PENDING" | "CANCELLED_BY_USER" | "CANCELLED_BY_AGENT" | "NO_SHOW" | "CONFIRMED" | "CHECKED_IN" | "IN_PROGRESS" | "MISSED";
    comment?: string | undefined;
}>;
export declare const completeDto: z.ZodObject<{
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    notes?: string | undefined;
}, {
    notes?: string | undefined;
}>;
export declare const cancelDto: z.ZodObject<{
    reason: z.ZodString;
    cancelledBy: z.ZodOptional<z.ZodEnum<["USER", "AGENT"]>>;
}, "strip", z.ZodTypeAny, {
    reason: string;
    cancelledBy?: "AGENT" | "USER" | undefined;
}, {
    reason: string;
    cancelledBy?: "AGENT" | "USER" | undefined;
}>;
export declare const printDailyDto: z.ZodObject<{
    date: z.ZodString;
    agentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    subServiceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    format: z.ZodDefault<z.ZodEnum<["PDF", "THERMAL"]>>;
}, "strip", z.ZodTypeAny, {
    date: string;
    format: "PDF" | "THERMAL";
    subServiceId?: string | null | undefined;
    agentId?: string | null | undefined;
}, {
    date: string;
    subServiceId?: string | null | undefined;
    agentId?: string | null | undefined;
    format?: "PDF" | "THERMAL" | undefined;
}>;
export declare const printHistoryQueryDto: z.ZodObject<{
    date: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
}, {
    date: string;
}>;
export declare const addNoteDto: z.ZodObject<{
    content: z.ZodString;
    isInternal: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    content: string;
    isInternal?: boolean | undefined;
}, {
    content: string;
    isInternal?: boolean | undefined;
}>;
//# sourceMappingURL=dto.d.ts.map