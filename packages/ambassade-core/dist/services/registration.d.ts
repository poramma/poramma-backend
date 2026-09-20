import type { Db } from "../db-type";
export type UserType = "student" | "worker" | "migrant" | "other";
export type RegistrationStatus = "INCOMPLETE" | "SUBMITTED" | "VALIDATED" | "REJECTED" | "SUSPENDED";
export declare function computeRegistrationStatus(row: {
    status: string;
    submittedAt: Date | null;
}): RegistrationStatus;
export declare function getRegistrationChecklist(db: Db, userId: string): Promise<{
    registrationStatus: RegistrationStatus;
    status: "PENDING" | "VALIDATED" | "REJECTED" | "SUSPENDED";
    isValidated: boolean;
    submittedAt: Date | null;
    inue: string | null;
    inueAssignedAt: Date | null;
    reviewNote: string | null;
    reviewedAt: Date | null;
    userType: UserType;
    info: {
        complete: boolean;
        missing: string[];
    };
    documents: {
        complete: boolean;
        missing: string[];
        items: {
            key: string;
            label: string;
            acceptedTypes: string[];
            optional: boolean;
            provided: boolean;
            documentId: string | null;
            documentStatus: string | null;
        }[];
    };
    canSubmit: boolean;
}>;
export declare function submitRegistration(db: Db, userId: string): Promise<{
    registrationStatus: RegistrationStatus;
    status: "PENDING" | "VALIDATED" | "REJECTED" | "SUSPENDED";
    isValidated: boolean;
    submittedAt: Date | null;
    inue: string | null;
    inueAssignedAt: Date | null;
    reviewNote: string | null;
    reviewedAt: Date | null;
    userType: UserType;
    info: {
        complete: boolean;
        missing: string[];
    };
    documents: {
        complete: boolean;
        missing: string[];
        items: {
            key: string;
            label: string;
            acceptedTypes: string[];
            optional: boolean;
            provided: boolean;
            documentId: string | null;
            documentStatus: string | null;
        }[];
    };
    canSubmit: boolean;
}>;
//# sourceMappingURL=registration.d.ts.map