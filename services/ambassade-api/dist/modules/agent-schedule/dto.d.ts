import { z } from "zod";
export declare const createAssignmentDto: z.ZodObject<{
    subServiceId: z.ZodString;
    validFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isPrimary: z.ZodOptional<z.ZodBoolean>;
    maxDailyAppointments: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    subServiceId: string;
    validFrom?: string | null | undefined;
    validUntil?: string | null | undefined;
    isPrimary?: boolean | undefined;
    maxDailyAppointments?: number | null | undefined;
    notes?: string | null | undefined;
}, {
    subServiceId: string;
    validFrom?: string | null | undefined;
    validUntil?: string | null | undefined;
    isPrimary?: boolean | undefined;
    maxDailyAppointments?: number | null | undefined;
    notes?: string | null | undefined;
}>;
export declare const updateAssignmentDto: z.ZodObject<{
    subServiceId: z.ZodOptional<z.ZodString>;
    validFrom: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    validUntil: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    isPrimary: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    maxDailyAppointments: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    notes: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
} & {
    active: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    active?: boolean | undefined;
    subServiceId?: string | undefined;
    validFrom?: string | null | undefined;
    validUntil?: string | null | undefined;
    isPrimary?: boolean | undefined;
    maxDailyAppointments?: number | null | undefined;
    notes?: string | null | undefined;
}, {
    active?: boolean | undefined;
    subServiceId?: string | undefined;
    validFrom?: string | null | undefined;
    validUntil?: string | null | undefined;
    isPrimary?: boolean | undefined;
    maxDailyAppointments?: number | null | undefined;
    notes?: string | null | undefined;
}>;
export declare const createAvailabilityDto: z.ZodObject<{
    dayOfWeek: z.ZodNumber;
    startTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    endTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isAvailable: z.ZodOptional<z.ZodBoolean>;
    validFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    dayOfWeek: number;
    startTime?: string | null | undefined;
    endTime?: string | null | undefined;
    validFrom?: string | null | undefined;
    validUntil?: string | null | undefined;
    isAvailable?: boolean | undefined;
}, {
    dayOfWeek: number;
    startTime?: string | null | undefined;
    endTime?: string | null | undefined;
    validFrom?: string | null | undefined;
    validUntil?: string | null | undefined;
    isAvailable?: boolean | undefined;
}>;
export declare const updateAvailabilityDto: z.ZodObject<{
    dayOfWeek: z.ZodOptional<z.ZodNumber>;
    startTime: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    endTime: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    isAvailable: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    validFrom: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    validUntil: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    dayOfWeek?: number | undefined;
    startTime?: string | null | undefined;
    endTime?: string | null | undefined;
    validFrom?: string | null | undefined;
    validUntil?: string | null | undefined;
    isAvailable?: boolean | undefined;
}, {
    dayOfWeek?: number | undefined;
    startTime?: string | null | undefined;
    endTime?: string | null | undefined;
    validFrom?: string | null | undefined;
    validUntil?: string | null | undefined;
    isAvailable?: boolean | undefined;
}>;
export declare const createExceptionDto: z.ZodObject<{
    date: z.ZodString;
    type: z.ZodEnum<["ABSENCE", "TRAINING", "HOLIDAY", "MISSION", "OTHER"]>;
    reason: z.ZodString;
    isFullDay: z.ZodOptional<z.ZodBoolean>;
    startTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    endTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    date: string;
    type: "ABSENCE" | "TRAINING" | "HOLIDAY" | "MISSION" | "OTHER";
    reason: string;
    startTime?: string | null | undefined;
    endTime?: string | null | undefined;
    isFullDay?: boolean | undefined;
}, {
    date: string;
    type: "ABSENCE" | "TRAINING" | "HOLIDAY" | "MISSION" | "OTHER";
    reason: string;
    startTime?: string | null | undefined;
    endTime?: string | null | undefined;
    isFullDay?: boolean | undefined;
}>;
//# sourceMappingURL=dto.d.ts.map