import { z } from "zod";
export declare const createDemandeDto: z.ZodObject<{
    userId: z.ZodString;
    subServiceId: z.ZodString;
    priority: z.ZodOptional<z.ZodEnum<["LOW", "NORMAL", "HIGH", "URGENT"]>>;
    totalAmount: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    currency: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customPayload: z.ZodOptional<z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, "strip", z.ZodTypeAny, {
    subServiceId: string;
    userId: string;
    currency?: string | null | undefined;
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" | undefined;
    totalAmount?: number | null | undefined;
    customPayload?: Record<string, unknown> | null | undefined;
}, {
    subServiceId: string;
    userId: string;
    currency?: string | null | undefined;
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" | undefined;
    totalAmount?: number | null | undefined;
    customPayload?: Record<string, unknown> | null | undefined;
}>;
export declare const listDemandesQueryDto: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["DRAFT", "SUBMITTED", "IN_REVIEW", "ADDITIONAL_INFO_REQUIRED", "UNDER_VERIFICATION", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED", "ARCHIVED"]>>;
    priority: z.ZodOptional<z.ZodEnum<["LOW", "NORMAL", "HIGH", "URGENT"]>>;
    subServiceId: z.ZodOptional<z.ZodString>;
    assignedAgentId: z.ZodOptional<z.ZodString>;
    dossierNumber: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    isOverdue: z.ZodOptional<z.ZodBoolean>;
    page: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
    subServiceId?: string | undefined;
    status?: "ADDITIONAL_INFO_REQUIRED" | "COMPLETED" | "REJECTED" | "CANCELLED" | "ARCHIVED" | "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "UNDER_VERIFICATION" | "APPROVED" | undefined;
    assignedAgentId?: string | undefined;
    dossierNumber?: string | undefined;
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" | undefined;
    limit?: number | undefined;
    isOverdue?: boolean | undefined;
    page?: number | undefined;
}, {
    search?: string | undefined;
    subServiceId?: string | undefined;
    status?: "ADDITIONAL_INFO_REQUIRED" | "COMPLETED" | "REJECTED" | "CANCELLED" | "ARCHIVED" | "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "UNDER_VERIFICATION" | "APPROVED" | undefined;
    assignedAgentId?: string | undefined;
    dossierNumber?: string | undefined;
    priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT" | undefined;
    limit?: number | undefined;
    isOverdue?: boolean | undefined;
    page?: number | undefined;
}>;
export declare const updateStatusDto: z.ZodObject<{
    status: z.ZodEnum<["DRAFT", "SUBMITTED", "IN_REVIEW", "ADDITIONAL_INFO_REQUIRED", "UNDER_VERIFICATION", "APPROVED", "REJECTED", "COMPLETED", "CANCELLED", "ARCHIVED"]>;
    comment: z.ZodString;
    isVisibleToUser: z.ZodBoolean;
    assignedAgentId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "ADDITIONAL_INFO_REQUIRED" | "COMPLETED" | "REJECTED" | "CANCELLED" | "ARCHIVED" | "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "UNDER_VERIFICATION" | "APPROVED";
    comment: string;
    isVisibleToUser: boolean;
    assignedAgentId?: string | undefined;
}, {
    status: "ADDITIONAL_INFO_REQUIRED" | "COMPLETED" | "REJECTED" | "CANCELLED" | "ARCHIVED" | "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "UNDER_VERIFICATION" | "APPROVED";
    comment: string;
    isVisibleToUser: boolean;
    assignedAgentId?: string | undefined;
}>;
export declare const assignDto: z.ZodObject<{
    agentId: z.ZodString;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    agentId: string;
    note?: string | undefined;
}, {
    agentId: string;
    note?: string | undefined;
}>;
export declare const addCommentDto: z.ZodObject<{
    content: z.ZodString;
    isInternal: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    content: string;
    isInternal?: boolean | undefined;
}, {
    content: string;
    isInternal?: boolean | undefined;
}>;
export declare const validateRequirementDto: z.ZodObject<{
    status: z.ZodEnum<["PENDING", "PROVIDED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"]>;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "REJECTED" | "PENDING" | "PROVIDED" | "UNDER_REVIEW" | "ACCEPTED";
    note?: string | undefined;
}, {
    status: "REJECTED" | "PENDING" | "PROVIDED" | "UNDER_REVIEW" | "ACCEPTED";
    note?: string | undefined;
}>;
//# sourceMappingURL=dto.d.ts.map