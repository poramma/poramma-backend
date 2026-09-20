import { z } from "zod";
export declare const listThreadsQueryDto: z.ZodObject<{
    demandeId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    demandeId?: string | undefined;
}, {
    demandeId?: string | undefined;
}>;
export declare const createThreadDto: z.ZodObject<{
    demandeId: z.ZodOptional<z.ZodString>;
    subject: z.ZodString;
    participantIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    subject: string;
    participantIds: string[];
    demandeId?: string | undefined;
}, {
    subject: string;
    demandeId?: string | undefined;
    participantIds?: string[] | undefined;
}>;
export declare const addParticipantDto: z.ZodObject<{
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    userId: string;
}, {
    userId: string;
}>;
export declare const updateThreadStatusDto: z.ZodObject<{
    status: z.ZodEnum<["OPEN", "CLOSED", "ESCALATED"]>;
}, "strip", z.ZodTypeAny, {
    status: "CLOSED" | "OPEN" | "ESCALATED";
}, {
    status: "CLOSED" | "OPEN" | "ESCALATED";
}>;
export declare const sendMessageDto: z.ZodObject<{
    body: z.ZodString;
}, "strip", z.ZodTypeAny, {
    body: string;
}, {
    body: string;
}>;
//# sourceMappingURL=dto.d.ts.map