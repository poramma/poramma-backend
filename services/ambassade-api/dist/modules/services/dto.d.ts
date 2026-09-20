import { z } from "zod";
export declare const createServiceDto: z.ZodObject<{
    name: z.ZodString;
    code: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    icon: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    order: z.ZodOptional<z.ZodNumber>;
    active: z.ZodOptional<z.ZodBoolean>;
    requiresAppointment: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    code: string;
    description?: string | null | undefined;
    icon?: string | null | undefined;
    order?: number | undefined;
    active?: boolean | undefined;
    requiresAppointment?: boolean | undefined;
}, {
    name: string;
    code: string;
    description?: string | null | undefined;
    icon?: string | null | undefined;
    order?: number | undefined;
    active?: boolean | undefined;
    requiresAppointment?: boolean | undefined;
}>;
export declare const updateServiceDto: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    icon: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    order: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    active: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    requiresAppointment: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    code?: string | undefined;
    description?: string | null | undefined;
    icon?: string | null | undefined;
    order?: number | undefined;
    active?: boolean | undefined;
    requiresAppointment?: boolean | undefined;
}, {
    name?: string | undefined;
    code?: string | undefined;
    description?: string | null | undefined;
    icon?: string | null | undefined;
    order?: number | undefined;
    active?: boolean | undefined;
    requiresAppointment?: boolean | undefined;
}>;
export declare const createSubServiceDto: z.ZodObject<{
    serviceId: z.ZodString;
    name: z.ZodString;
    code: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    active: z.ZodOptional<z.ZodBoolean>;
    basePrice: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    currency: z.ZodOptional<z.ZodString>;
    slaDays: z.ZodNumber;
    allowCustomRequest: z.ZodOptional<z.ZodBoolean>;
    requiresInPerson: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    code: string;
    serviceId: string;
    slaDays: number;
    description?: string | null | undefined;
    active?: boolean | undefined;
    basePrice?: number | null | undefined;
    currency?: string | undefined;
    allowCustomRequest?: boolean | undefined;
    requiresInPerson?: boolean | undefined;
}, {
    name: string;
    code: string;
    serviceId: string;
    slaDays: number;
    description?: string | null | undefined;
    active?: boolean | undefined;
    basePrice?: number | null | undefined;
    currency?: string | undefined;
    allowCustomRequest?: boolean | undefined;
    requiresInPerson?: boolean | undefined;
}>;
export declare const updateSubServiceDto: z.ZodObject<Omit<{
    serviceId: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
    code: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    active: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    basePrice: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodNumber>>>;
    currency: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    slaDays: z.ZodOptional<z.ZodNumber>;
    allowCustomRequest: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    requiresInPerson: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
}, "serviceId">, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    code?: string | undefined;
    description?: string | null | undefined;
    active?: boolean | undefined;
    basePrice?: number | null | undefined;
    currency?: string | undefined;
    slaDays?: number | undefined;
    allowCustomRequest?: boolean | undefined;
    requiresInPerson?: boolean | undefined;
}, {
    name?: string | undefined;
    code?: string | undefined;
    description?: string | null | undefined;
    active?: boolean | undefined;
    basePrice?: number | null | undefined;
    currency?: string | undefined;
    slaDays?: number | undefined;
    allowCustomRequest?: boolean | undefined;
    requiresInPerson?: boolean | undefined;
}>;
export declare const createScheduleDto: z.ZodObject<{
    dayOfWeek: z.ZodNumber;
    startTime: z.ZodString;
    endTime: z.ZodString;
    slotDurationMinutes: z.ZodOptional<z.ZodNumber>;
    maxConcurrentSlots: z.ZodOptional<z.ZodNumber>;
    isActive: z.ZodOptional<z.ZodBoolean>;
    validFrom: z.ZodOptional<z.ZodString>;
    validUntil: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes?: number | undefined;
    maxConcurrentSlots?: number | undefined;
    isActive?: boolean | undefined;
    validFrom?: string | undefined;
    validUntil?: string | null | undefined;
}, {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes?: number | undefined;
    maxConcurrentSlots?: number | undefined;
    isActive?: boolean | undefined;
    validFrom?: string | undefined;
    validUntil?: string | null | undefined;
}>;
export declare const updateScheduleDto: z.ZodObject<{
    dayOfWeek: z.ZodOptional<z.ZodNumber>;
    startTime: z.ZodOptional<z.ZodString>;
    endTime: z.ZodOptional<z.ZodString>;
    slotDurationMinutes: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    maxConcurrentSlots: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    isActive: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    validFrom: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    validUntil: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
}, "strip", z.ZodTypeAny, {
    dayOfWeek?: number | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    slotDurationMinutes?: number | undefined;
    maxConcurrentSlots?: number | undefined;
    isActive?: boolean | undefined;
    validFrom?: string | undefined;
    validUntil?: string | null | undefined;
}, {
    dayOfWeek?: number | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    slotDurationMinutes?: number | undefined;
    maxConcurrentSlots?: number | undefined;
    isActive?: boolean | undefined;
    validFrom?: string | undefined;
    validUntil?: string | null | undefined;
}>;
export declare const createExceptionDto: z.ZodObject<{
    date: z.ZodString;
    type: z.ZodEnum<["CLOSED", "SPECIAL_HOURS", "EXTRA_CAPACITY"]>;
    startTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    endTime: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    date: string;
    type: "CLOSED" | "SPECIAL_HOURS" | "EXTRA_CAPACITY";
    reason: string;
    startTime?: string | null | undefined;
    endTime?: string | null | undefined;
}, {
    date: string;
    type: "CLOSED" | "SPECIAL_HOURS" | "EXTRA_CAPACITY";
    reason: string;
    startTime?: string | null | undefined;
    endTime?: string | null | undefined;
}>;
export declare const createRequirementDto: z.ZodObject<{
    type: z.ZodEnum<["DOCUMENT", "FIELD", "FEE", "PHOTO", "SIGNATURE"]>;
    label: z.ZodString;
    key: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    required: z.ZodOptional<z.ZodBoolean>;
    order: z.ZodOptional<z.ZodNumber>;
    schema: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    type: "DOCUMENT" | "FIELD" | "FEE" | "PHOTO" | "SIGNATURE";
    label: string;
    key: string;
    description?: string | null | undefined;
    order?: number | undefined;
    schema?: Record<string, unknown> | null | undefined;
    required?: boolean | undefined;
}, {
    type: "DOCUMENT" | "FIELD" | "FEE" | "PHOTO" | "SIGNATURE";
    label: string;
    key: string;
    description?: string | null | undefined;
    order?: number | undefined;
    schema?: Record<string, unknown> | null | undefined;
    required?: boolean | undefined;
}>;
export declare const updateRequirementDto: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<["DOCUMENT", "FIELD", "FEE", "PHOTO", "SIGNATURE"]>>;
    label: z.ZodOptional<z.ZodString>;
    key: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    required: z.ZodOptional<z.ZodOptional<z.ZodBoolean>>;
    order: z.ZodOptional<z.ZodOptional<z.ZodNumber>>;
    schema: z.ZodOptional<z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>>;
}, "strip", z.ZodTypeAny, {
    description?: string | null | undefined;
    order?: number | undefined;
    schema?: Record<string, unknown> | null | undefined;
    type?: "DOCUMENT" | "FIELD" | "FEE" | "PHOTO" | "SIGNATURE" | undefined;
    label?: string | undefined;
    key?: string | undefined;
    required?: boolean | undefined;
}, {
    description?: string | null | undefined;
    order?: number | undefined;
    schema?: Record<string, unknown> | null | undefined;
    type?: "DOCUMENT" | "FIELD" | "FEE" | "PHOTO" | "SIGNATURE" | undefined;
    label?: string | undefined;
    key?: string | undefined;
    required?: boolean | undefined;
}>;
//# sourceMappingURL=dto.d.ts.map