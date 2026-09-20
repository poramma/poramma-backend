import { z } from "zod";
export declare const createAgentRequestDto: z.ZodEffects<z.ZodObject<{
    kind: z.ZodEnum<["ACCESS_REQUEST", "REPORT"]>;
    category: z.ZodEnum<["SERVICE_ACCESS", "PERMISSION_CHANGE", "ROLE_CHANGE", "ASSIGNMENT_ISSUE", "PERMISSION_ISSUE", "DATA_ISSUE", "SECURITY", "OTHER"]>;
    subject: z.ZodString;
    description: z.ZodString;
    targetSubServiceId: z.ZodOptional<z.ZodString>;
    targetPermission: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    description: string;
    subject: string;
    category: "OTHER" | "SECURITY" | "SERVICE_ACCESS" | "PERMISSION_CHANGE" | "ROLE_CHANGE" | "ASSIGNMENT_ISSUE" | "PERMISSION_ISSUE" | "DATA_ISSUE";
    kind: "ACCESS_REQUEST" | "REPORT";
    targetSubServiceId?: string | undefined;
    targetPermission?: string | undefined;
}, {
    description: string;
    subject: string;
    category: "OTHER" | "SECURITY" | "SERVICE_ACCESS" | "PERMISSION_CHANGE" | "ROLE_CHANGE" | "ASSIGNMENT_ISSUE" | "PERMISSION_ISSUE" | "DATA_ISSUE";
    kind: "ACCESS_REQUEST" | "REPORT";
    targetSubServiceId?: string | undefined;
    targetPermission?: string | undefined;
}>, {
    description: string;
    subject: string;
    category: "OTHER" | "SECURITY" | "SERVICE_ACCESS" | "PERMISSION_CHANGE" | "ROLE_CHANGE" | "ASSIGNMENT_ISSUE" | "PERMISSION_ISSUE" | "DATA_ISSUE";
    kind: "ACCESS_REQUEST" | "REPORT";
    targetSubServiceId?: string | undefined;
    targetPermission?: string | undefined;
}, {
    description: string;
    subject: string;
    category: "OTHER" | "SECURITY" | "SERVICE_ACCESS" | "PERMISSION_CHANGE" | "ROLE_CHANGE" | "ASSIGNMENT_ISSUE" | "PERMISSION_ISSUE" | "DATA_ISSUE";
    kind: "ACCESS_REQUEST" | "REPORT";
    targetSubServiceId?: string | undefined;
    targetPermission?: string | undefined;
}>;
export declare const listAgentRequestsQueryDto: z.ZodObject<{
    status: z.ZodOptional<z.ZodEnum<["PENDING", "IN_PROGRESS", "APPROVED", "REJECTED", "RESOLVED"]>>;
    kind: z.ZodOptional<z.ZodEnum<["ACCESS_REQUEST", "REPORT"]>>;
    category: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    page: z.ZodOptional<z.ZodNumber>;
    limit: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    search?: string | undefined;
    status?: "REJECTED" | "APPROVED" | "PENDING" | "IN_PROGRESS" | "RESOLVED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    category?: string | undefined;
    kind?: "ACCESS_REQUEST" | "REPORT" | undefined;
}, {
    search?: string | undefined;
    status?: "REJECTED" | "APPROVED" | "PENDING" | "IN_PROGRESS" | "RESOLVED" | undefined;
    limit?: number | undefined;
    page?: number | undefined;
    category?: string | undefined;
    kind?: "ACCESS_REQUEST" | "REPORT" | undefined;
}>;
export declare const processAgentRequestDto: z.ZodObject<{
    status: z.ZodEnum<["IN_PROGRESS", "APPROVED", "REJECTED", "RESOLVED"]>;
    response: z.ZodOptional<z.ZodString>;
    applyAssignment: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    status: "REJECTED" | "APPROVED" | "IN_PROGRESS" | "RESOLVED";
    response?: string | undefined;
    applyAssignment?: boolean | undefined;
}, {
    status: "REJECTED" | "APPROVED" | "IN_PROGRESS" | "RESOLVED";
    response?: string | undefined;
    applyAssignment?: boolean | undefined;
}>;
//# sourceMappingURL=dto.d.ts.map