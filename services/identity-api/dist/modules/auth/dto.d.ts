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
    password: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    otp: string;
    phone?: string | undefined;
}, {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    otp: string;
    phone?: string | undefined;
}>;
export declare const loginDto: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    rememberMe: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    rememberMe?: boolean | undefined;
}, {
    email: string;
    password: string;
    rememberMe?: boolean | undefined;
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
export declare const switchRoleDto: z.ZodObject<{
    roleId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    roleId: string;
}, {
    roleId: string;
}>;
export declare const forgotPasswordDto: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
}>;
export declare const resetPasswordDto: z.ZodObject<{
    email: z.ZodString;
    otp: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    otp: string;
    newPassword: string;
}, {
    email: string;
    otp: string;
    newPassword: string;
}>;
//# sourceMappingURL=dto.d.ts.map