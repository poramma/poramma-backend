import type { Db } from "../db-type";
export declare function getActorName(db: Db, userId: string): Promise<string>;
export declare function getUser(db: Db, userId: string): Promise<{
    profile: ({
        id: string;
        userId: string;
        inue: string | null;
        userType: string | null;
        firstName: string | null;
        lastName: string | null;
        nationality: string | null;
        address: string | null;
        city: string | null;
        country: string | null;
    } & {
        inue: string | null;
    }) | null;
    id: string;
    email: string;
    phone: string | null;
    status: string | null;
    createdAt: Date | null;
} | null>;
export declare function getUsersByIds(db: Db, userIds: string[]): Promise<Map<string, {
    profile: ({
        id: string;
        userId: string;
        inue: string | null;
        userType: string | null;
        firstName: string | null;
        lastName: string | null;
        nationality: string | null;
        address: string | null;
        city: string | null;
        country: string | null;
    } & {
        inue: string | null;
    }) | null;
    id: string;
    email: string;
    phone: string | null;
    status: string | null;
    createdAt: Date | null;
}>>;
//# sourceMappingURL=identity.d.ts.map