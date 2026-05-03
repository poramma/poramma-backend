import { z } from "zod";
export declare const registerDto: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}>;
export declare const verifyOtpDto: z.ZodObject<{
    email: z.ZodString;
    otp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    otp: string;
}, {
    email: string;
    otp: string;
}>;
export declare const loginDto: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const refreshDto: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const updateProfileDto: z.ZodObject<{
    userType: z.ZodEnum<["student", "worker", "migrant", "other"]>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    userType: "student" | "worker" | "migrant" | "other";
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    city?: string | undefined;
}, {
    userType: "student" | "worker" | "migrant" | "other";
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | undefined;
    city?: string | undefined;
}>;
//# sourceMappingURL=dto.d.ts.map