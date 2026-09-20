import type { Db } from "../db-type";
import { etudiants } from "../schema/etudiants";
type EtudiantRow = typeof etudiants.$inferSelect;
export declare function ensureEtudiantRecord(db: Db, userId: string): Promise<EtudiantRow>;
export declare function getRegistrationStatus(db: Db, userId: string): Promise<{
    status: "PENDING" | "VALIDATED" | "REJECTED" | "SUSPENDED";
    isValidated: boolean;
    submittedAt: Date | null;
    inue: string | null;
    inueAssignedAt: Date | null;
    reviewNote: string | null;
    reviewedAt: Date | null;
}>;
export {};
//# sourceMappingURL=etudiants.d.ts.map