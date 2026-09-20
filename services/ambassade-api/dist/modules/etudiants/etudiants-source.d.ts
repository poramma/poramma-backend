export interface EtudiantRaw {
    userId: string;
    email: string;
    phone: string | null;
    accountStatus: string | null;
    registeredAt: Date | null;
    inue: string | null;
    firstName: string | null;
    lastName: string | null;
    nationality: string | null;
    city: string | null;
    country: string | null;
    university: string | null;
    faculty: string | null;
    studyLevel: string | null;
    hasBourse: boolean;
    scholarshipDecisionNumber: string | null;
    scholarshipPromotion: string | null;
}
export interface EtudiantsListFilters {
    search?: string;
    city?: string;
    university?: string;
    faculty?: string;
    studyLevel?: string;
    hasBourse?: boolean;
    userIds?: string[];
}
export interface EtudiantsSource {
    findByUserId(userId: string): Promise<EtudiantRaw | null>;
    list(filters: EtudiantsListFilters): Promise<EtudiantRaw[]>;
    search(query: string): Promise<EtudiantRaw[]>;
}
export declare class LocalDbEtudiantsSource implements EtudiantsSource {
    findByUserId(userId: string): Promise<EtudiantRaw | null>;
    list(filters: EtudiantsListFilters): Promise<EtudiantRaw[]>;
    search(query: string): Promise<EtudiantRaw[]>;
}
export declare class RemoteEtudiantsSource implements EtudiantsSource {
    findByUserId(_userId: string): Promise<EtudiantRaw | null>;
    list(_filters: EtudiantsListFilters): Promise<EtudiantRaw[]>;
    search(_query: string): Promise<EtudiantRaw[]>;
}
export declare function createEtudiantsSource(): EtudiantsSource;
export declare const etudiantsSource: EtudiantsSource;
//# sourceMappingURL=etudiants-source.d.ts.map