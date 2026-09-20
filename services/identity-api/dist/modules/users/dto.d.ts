import { z } from "zod";
export declare const createUserDto: z.ZodObject<{
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
export declare const updatePersonalInfoDto: z.ZodObject<{
    firstName: z.ZodString;
    lastName: z.ZodString;
    phone: z.ZodOptional<z.ZodString>;
    userType: z.ZodOptional<z.ZodEnum<["student", "worker", "migrant", "other"]>>;
    gender: z.ZodOptional<z.ZodEnum<["MALE", "FEMALE"]>>;
    bio: z.ZodOptional<z.ZodString>;
    birthDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    lastName: string;
    phone?: string | undefined;
    userType?: "student" | "worker" | "migrant" | "other" | undefined;
    bio?: string | undefined;
    birthDate?: string | undefined;
    gender?: "MALE" | "FEMALE" | undefined;
}, {
    firstName: string;
    lastName: string;
    phone?: string | undefined;
    userType?: "student" | "worker" | "migrant" | "other" | undefined;
    bio?: string | undefined;
    birthDate?: string | undefined;
    gender?: "MALE" | "FEMALE" | undefined;
}>;
export declare const updateAddressDto: z.ZodObject<{
    address: z.ZodOptional<z.ZodString>;
    city: z.ZodOptional<z.ZodString>;
    country: z.ZodOptional<z.ZodString>;
    zipCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    city?: string | undefined;
    address?: string | undefined;
    country?: string | undefined;
    zipCode?: string | undefined;
}, {
    city?: string | undefined;
    address?: string | undefined;
    country?: string | undefined;
    zipCode?: string | undefined;
}>;
export declare const updateStudentProfileDto: z.ZodObject<{
    university: z.ZodOptional<z.ZodString>;
    faculty: z.ZodOptional<z.ZodString>;
    studyLevel: z.ZodOptional<z.ZodString>;
    scholarship: z.ZodOptional<z.ZodObject<{
        isRecipient: z.ZodBoolean;
        decisionNumber: z.ZodOptional<z.ZodString>;
        promotion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        isRecipient: boolean;
        decisionNumber?: string | undefined;
        promotion?: string | undefined;
    }, {
        isRecipient: boolean;
        decisionNumber?: string | undefined;
        promotion?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    university?: string | undefined;
    faculty?: string | undefined;
    studyLevel?: string | undefined;
    scholarship?: {
        isRecipient: boolean;
        decisionNumber?: string | undefined;
        promotion?: string | undefined;
    } | undefined;
}, {
    university?: string | undefined;
    faculty?: string | undefined;
    studyLevel?: string | undefined;
    scholarship?: {
        isRecipient: boolean;
        decisionNumber?: string | undefined;
        promotion?: string | undefined;
    } | undefined;
}>;
export declare const updateWorkerProfileDto: z.ZodObject<{
    employer: z.ZodOptional<z.ZodString>;
    profession: z.ZodOptional<z.ZodString>;
    contractType: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    employer?: string | undefined;
    profession?: string | undefined;
    contractType?: string | undefined;
}, {
    employer?: string | undefined;
    profession?: string | undefined;
    contractType?: string | undefined;
}>;
export declare const updateUserStatusDto: z.ZodObject<{
    status: z.ZodEnum<["UNVERIFIED", "PENDING", "VERIFIED", "SUSPENDED"]>;
}, "strip", z.ZodTypeAny, {
    status: "UNVERIFIED" | "VERIFIED" | "SUSPENDED" | "PENDING";
}, {
    status: "UNVERIFIED" | "VERIFIED" | "SUSPENDED" | "PENDING";
}>;
export declare const enrollStudentDto: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    firstName: z.ZodString;
    lastName: z.ZodString;
    university: z.ZodOptional<z.ZodString>;
    faculty: z.ZodOptional<z.ZodString>;
    studyLevel: z.ZodOptional<z.ZodString>;
    scholarship: z.ZodOptional<z.ZodObject<{
        isRecipient: z.ZodBoolean;
        decisionNumber: z.ZodOptional<z.ZodString>;
        promotion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        isRecipient: boolean;
        decisionNumber?: string | undefined;
        promotion?: string | undefined;
    }, {
        isRecipient: boolean;
        decisionNumber?: string | undefined;
        promotion?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    email: string;
    firstName: string;
    lastName: string;
    password?: string | undefined;
    phone?: string | undefined;
    university?: string | undefined;
    faculty?: string | undefined;
    studyLevel?: string | undefined;
    scholarship?: {
        isRecipient: boolean;
        decisionNumber?: string | undefined;
        promotion?: string | undefined;
    } | undefined;
}, {
    email: string;
    firstName: string;
    lastName: string;
    password?: string | undefined;
    phone?: string | undefined;
    university?: string | undefined;
    faculty?: string | undefined;
    studyLevel?: string | undefined;
    scholarship?: {
        isRecipient: boolean;
        decisionNumber?: string | undefined;
        promotion?: string | undefined;
    } | undefined;
}>;
//# sourceMappingURL=dto.d.ts.map