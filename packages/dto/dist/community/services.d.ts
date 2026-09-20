import { z } from "zod";
export declare const listServicesQueryDto: z.ZodObject<{
    q: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    q?: string | undefined;
}, {
    q?: string | undefined;
}>;
export declare const availabilityQueryDto: z.ZodObject<{
    date: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
}, {
    date: string;
}>;
//# sourceMappingURL=services.d.ts.map