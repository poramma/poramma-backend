import { z } from "zod";
export declare const createCampagneDto: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    type: z.ZodEnum<["INFO", "ALERT", "EVENT", "SURVEY", "REMINDER"]>;
    coverImageFileId: z.ZodOptional<z.ZodString>;
    targetFilters: z.ZodDefault<z.ZodObject<{
        cities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        statuses: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        studyLevels: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        faculties: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        hasBourse: z.ZodOptional<z.ZodBoolean>;
        universities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        userIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        cities?: string[] | undefined;
        statuses?: string[] | undefined;
        studyLevels?: string[] | undefined;
        faculties?: string[] | undefined;
        hasBourse?: boolean | undefined;
        universities?: string[] | undefined;
        userIds?: string[] | undefined;
    }, {
        cities?: string[] | undefined;
        statuses?: string[] | undefined;
        studyLevels?: string[] | undefined;
        faculties?: string[] | undefined;
        hasBourse?: boolean | undefined;
        universities?: string[] | undefined;
        userIds?: string[] | undefined;
    }>>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    channels: z.ZodDefault<z.ZodArray<z.ZodEnum<["IN_APP", "EMAIL", "SMS", "PUSH", "WHATSAPP"]>, "many">>;
}, "strip", z.ZodTypeAny, {
    type: "INFO" | "ALERT" | "EVENT" | "SURVEY" | "REMINDER";
    content: string;
    title: string;
    targetFilters: {
        cities?: string[] | undefined;
        statuses?: string[] | undefined;
        studyLevels?: string[] | undefined;
        faculties?: string[] | undefined;
        hasBourse?: boolean | undefined;
        universities?: string[] | undefined;
        userIds?: string[] | undefined;
    };
    channels: ("EMAIL" | "IN_APP" | "SMS" | "PUSH" | "WHATSAPP")[];
    scheduledAt?: string | undefined;
    coverImageFileId?: string | undefined;
}, {
    type: "INFO" | "ALERT" | "EVENT" | "SURVEY" | "REMINDER";
    content: string;
    title: string;
    targetFilters?: {
        cities?: string[] | undefined;
        statuses?: string[] | undefined;
        studyLevels?: string[] | undefined;
        faculties?: string[] | undefined;
        hasBourse?: boolean | undefined;
        universities?: string[] | undefined;
        userIds?: string[] | undefined;
    } | undefined;
    channels?: ("EMAIL" | "IN_APP" | "SMS" | "PUSH" | "WHATSAPP")[] | undefined;
    scheduledAt?: string | undefined;
    coverImageFileId?: string | undefined;
}>;
export declare const updateCampagneDto: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodEnum<["INFO", "ALERT", "EVENT", "SURVEY", "REMINDER"]>>;
    coverImageFileId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    targetFilters: z.ZodOptional<z.ZodDefault<z.ZodObject<{
        cities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        statuses: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        studyLevels: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        faculties: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        hasBourse: z.ZodOptional<z.ZodBoolean>;
        universities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        userIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        cities?: string[] | undefined;
        statuses?: string[] | undefined;
        studyLevels?: string[] | undefined;
        faculties?: string[] | undefined;
        hasBourse?: boolean | undefined;
        universities?: string[] | undefined;
        userIds?: string[] | undefined;
    }, {
        cities?: string[] | undefined;
        statuses?: string[] | undefined;
        studyLevels?: string[] | undefined;
        faculties?: string[] | undefined;
        hasBourse?: boolean | undefined;
        universities?: string[] | undefined;
        userIds?: string[] | undefined;
    }>>>;
    scheduledAt: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    channels: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodEnum<["IN_APP", "EMAIL", "SMS", "PUSH", "WHATSAPP"]>, "many">>>;
}, "strip", z.ZodTypeAny, {
    type?: "INFO" | "ALERT" | "EVENT" | "SURVEY" | "REMINDER" | undefined;
    content?: string | undefined;
    title?: string | undefined;
    targetFilters?: {
        cities?: string[] | undefined;
        statuses?: string[] | undefined;
        studyLevels?: string[] | undefined;
        faculties?: string[] | undefined;
        hasBourse?: boolean | undefined;
        universities?: string[] | undefined;
        userIds?: string[] | undefined;
    } | undefined;
    channels?: ("EMAIL" | "IN_APP" | "SMS" | "PUSH" | "WHATSAPP")[] | undefined;
    scheduledAt?: string | undefined;
    coverImageFileId?: string | undefined;
}, {
    type?: "INFO" | "ALERT" | "EVENT" | "SURVEY" | "REMINDER" | undefined;
    content?: string | undefined;
    title?: string | undefined;
    targetFilters?: {
        cities?: string[] | undefined;
        statuses?: string[] | undefined;
        studyLevels?: string[] | undefined;
        faculties?: string[] | undefined;
        hasBourse?: boolean | undefined;
        universities?: string[] | undefined;
        userIds?: string[] | undefined;
    } | undefined;
    channels?: ("EMAIL" | "IN_APP" | "SMS" | "PUSH" | "WHATSAPP")[] | undefined;
    scheduledAt?: string | undefined;
    coverImageFileId?: string | undefined;
}>;
export declare const listCampagnesQueryDto: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "SCHEDULED", "SENDING", "SENT", "FAILED", "CANCELLED"]>>;
    type: z.ZodOptional<z.ZodEnum<["INFO", "ALERT", "EVENT", "SURVEY", "REMINDER"]>>;
}, "strip", z.ZodTypeAny, {
    type?: "INFO" | "ALERT" | "EVENT" | "SURVEY" | "REMINDER" | undefined;
    status?: "CANCELLED" | "DRAFT" | "SCHEDULED" | "SENT" | "SENDING" | "FAILED" | undefined;
}, {
    type?: "INFO" | "ALERT" | "EVENT" | "SURVEY" | "REMINDER" | undefined;
    status?: "CANCELLED" | "DRAFT" | "SCHEDULED" | "SENT" | "SENDING" | "FAILED" | undefined;
}>;
export declare const estimateRecipientsDto: z.ZodObject<{
    cities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    statuses: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    studyLevels: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    faculties: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    hasBourse: z.ZodOptional<z.ZodBoolean>;
    universities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    userIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    cities?: string[] | undefined;
    statuses?: string[] | undefined;
    studyLevels?: string[] | undefined;
    faculties?: string[] | undefined;
    hasBourse?: boolean | undefined;
    universities?: string[] | undefined;
    userIds?: string[] | undefined;
}, {
    cities?: string[] | undefined;
    statuses?: string[] | undefined;
    studyLevels?: string[] | undefined;
    faculties?: string[] | undefined;
    hasBourse?: boolean | undefined;
    universities?: string[] | undefined;
    userIds?: string[] | undefined;
}>;
export declare const uploadAttachmentDto: z.ZodObject<{
    type: z.ZodEnum<["IMAGE", "VIDEO", "DOCUMENT"]>;
    caption: z.ZodOptional<z.ZodString>;
    isBanner: z.ZodOptional<z.ZodEffects<z.ZodBoolean, boolean, unknown>>;
}, "strip", z.ZodTypeAny, {
    type: "DOCUMENT" | "IMAGE" | "VIDEO";
    caption?: string | undefined;
    isBanner?: boolean | undefined;
}, {
    type: "DOCUMENT" | "IMAGE" | "VIDEO";
    caption?: string | undefined;
    isBanner?: unknown;
}>;
export declare const updateAttachmentDto: z.ZodEffects<z.ZodObject<{
    isBanner: z.ZodOptional<z.ZodBoolean>;
    caption: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    caption?: string | null | undefined;
    isBanner?: boolean | undefined;
}, {
    caption?: string | null | undefined;
    isBanner?: boolean | undefined;
}>, {
    caption?: string | null | undefined;
    isBanner?: boolean | undefined;
}, {
    caption?: string | null | undefined;
    isBanner?: boolean | undefined;
}>;
export declare const reorderAttachmentsDto: z.ZodObject<{
    orderedAttachmentIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    orderedAttachmentIds: string[];
}, {
    orderedAttachmentIds: string[];
}>;
export declare const scheduleCampagneDto: z.ZodObject<{
    scheduledAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    scheduledAt: string;
}, {
    scheduledAt: string;
}>;
//# sourceMappingURL=dto.d.ts.map