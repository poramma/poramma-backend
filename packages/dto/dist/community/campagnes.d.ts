import { z } from "zod";
export declare const listCampagnesQueryDto: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["INFO", "ALERT", "EVENT", "SURVEY", "REMINDER"]>>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    type?: "INFO" | "ALERT" | "EVENT" | "SURVEY" | "REMINDER" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}, {
    type?: "INFO" | "ALERT" | "EVENT" | "SURVEY" | "REMINDER" | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
export declare const clickCampagneDto: z.ZodObject<{
    targetId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    targetId: string;
}, {
    targetId: string;
}>;
export declare const reactionTypeDto: z.ZodEnum<["LIKE", "PARTICIPATE"]>;
//# sourceMappingURL=campagnes.d.ts.map