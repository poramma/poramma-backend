import { z } from "zod";
export declare const createAgentDto: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    firstName: z.ZodString;
    lastName: z.ZodString;
    matricule: z.ZodString;
    roleTitle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    department: z.ZodEnum<["CONSULAR", "ADMINISTRATIVE", "FINANCIAL", "COMMUNICATION", "SECURITY", "STUDIES"]>;
    officeNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    roleId: z.ZodString;
    active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email: string;
    firstName: string;
    lastName: string;
    roleId: string;
    matricule: string;
    department: "CONSULAR" | "ADMINISTRATIVE" | "FINANCIAL" | "COMMUNICATION" | "SECURITY" | "STUDIES";
    password?: string | undefined;
    phone?: string | null | undefined;
    roleTitle?: string | null | undefined;
    officeNumber?: string | null | undefined;
    active?: boolean | undefined;
}, {
    email: string;
    firstName: string;
    lastName: string;
    roleId: string;
    matricule: string;
    department: "CONSULAR" | "ADMINISTRATIVE" | "FINANCIAL" | "COMMUNICATION" | "SECURITY" | "STUDIES";
    password?: string | undefined;
    phone?: string | null | undefined;
    roleTitle?: string | null | undefined;
    officeNumber?: string | null | undefined;
    active?: boolean | undefined;
}>;
export declare const updateAgentDto: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    matricule: z.ZodOptional<z.ZodString>;
    roleTitle: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    department: z.ZodOptional<z.ZodEnum<["CONSULAR", "ADMINISTRATIVE", "FINANCIAL", "COMMUNICATION", "SECURITY", "STUDIES"]>>;
    officeNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    email?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | null | undefined;
    matricule?: string | undefined;
    roleTitle?: string | null | undefined;
    department?: "CONSULAR" | "ADMINISTRATIVE" | "FINANCIAL" | "COMMUNICATION" | "SECURITY" | "STUDIES" | undefined;
    officeNumber?: string | null | undefined;
    active?: boolean | undefined;
}, {
    email?: string | undefined;
    firstName?: string | undefined;
    lastName?: string | undefined;
    phone?: string | null | undefined;
    matricule?: string | undefined;
    roleTitle?: string | null | undefined;
    department?: "CONSULAR" | "ADMINISTRATIVE" | "FINANCIAL" | "COMMUNICATION" | "SECURITY" | "STUDIES" | undefined;
    officeNumber?: string | null | undefined;
    active?: boolean | undefined;
}>;
export declare const listAgentsQueryDto: z.ZodObject<{
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
    department: z.ZodOptional<z.ZodEnum<["CONSULAR", "ADMINISTRATIVE", "FINANCIAL", "COMMUNICATION", "SECURITY", "STUDIES"]>>;
    role: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
    status?: string | undefined;
    department?: "CONSULAR" | "ADMINISTRATIVE" | "FINANCIAL" | "COMMUNICATION" | "SECURITY" | "STUDIES" | undefined;
    role?: string | undefined;
}, {
    search?: string | undefined;
    status?: string | undefined;
    department?: "CONSULAR" | "ADMINISTRATIVE" | "FINANCIAL" | "COMMUNICATION" | "SECURITY" | "STUDIES" | undefined;
    role?: string | undefined;
}>;
//# sourceMappingURL=dto.d.ts.map