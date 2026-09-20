import { z } from "zod";
export declare const updateOwnProfileDto: z.ZodObject<{
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    nationality: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    city: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    country: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    city?: string | null | undefined;
    nationality?: string | null | undefined;
    address?: string | null | undefined;
    country?: string | null | undefined;
    dateOfBirth?: string | null | undefined;
}, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    city?: string | null | undefined;
    nationality?: string | null | undefined;
    address?: string | null | undefined;
    country?: string | null | undefined;
    dateOfBirth?: string | null | undefined;
}>;
export declare const updatePreferencesDto: z.ZodObject<{
    theme: z.ZodOptional<z.ZodEnum<["light", "dark", "system"]>>;
    language: z.ZodOptional<z.ZodEnum<["fr", "bm"]>>;
    notificationsEmail: z.ZodOptional<z.ZodBoolean>;
    notificationsInApp: z.ZodOptional<z.ZodBoolean>;
    notificationTypes: z.ZodOptional<z.ZodObject<{
        demandeAssigned: z.ZodOptional<z.ZodBoolean>;
        documentPending: z.ZodOptional<z.ZodBoolean>;
        rendezVousReminder: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        demandeAssigned?: boolean | undefined;
        documentPending?: boolean | undefined;
        rendezVousReminder?: boolean | undefined;
    }, {
        demandeAssigned?: boolean | undefined;
        documentPending?: boolean | undefined;
        rendezVousReminder?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    theme?: "system" | "light" | "dark" | undefined;
    language?: "fr" | "bm" | undefined;
    notificationsEmail?: boolean | undefined;
    notificationsInApp?: boolean | undefined;
    notificationTypes?: {
        demandeAssigned?: boolean | undefined;
        documentPending?: boolean | undefined;
        rendezVousReminder?: boolean | undefined;
    } | undefined;
}, {
    theme?: "system" | "light" | "dark" | undefined;
    language?: "fr" | "bm" | undefined;
    notificationsEmail?: boolean | undefined;
    notificationsInApp?: boolean | undefined;
    notificationTypes?: {
        demandeAssigned?: boolean | undefined;
        documentPending?: boolean | undefined;
        rendezVousReminder?: boolean | undefined;
    } | undefined;
}>;
export declare const updatePasswordDto: z.ZodObject<{
    currentPassword: z.ZodString;
    newPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    newPassword: string;
    currentPassword: string;
}, {
    newPassword: string;
    currentPassword: string;
}>;
export declare const activitiesQueryDto: z.ZodObject<{
    offset: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
}>;
//# sourceMappingURL=dto.d.ts.map