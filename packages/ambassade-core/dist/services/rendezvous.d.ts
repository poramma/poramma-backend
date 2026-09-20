import type { Db } from "../db-type";
import { rendezVous } from "../schema/rendezvous";
export declare const TZ = "Africa/Casablanca";
export declare const BOOKING_HORIZON_DAYS = 60;
export declare const RELEASED_STATUSES: string[];
export declare const MODIFIABLE_STATUSES: string[];
export declare function isoDayOfWeek(date: string): number;
export declare function timeToMinutes(t: string): number;
export declare function minutesToTime(m: number): string;
export declare function addDays(date: string, days: number): string;
export declare function nowInEmbassyTz(now?: Date): {
    date: string;
    minutes: number;
};
declare function isUniqueViolation(err: unknown): boolean;
export interface RawSlot {
    id: string;
    subServiceId: string;
    agentId: string;
    date: string;
    startTime: string;
    endTime: string;
    maxConcurrent: number;
    maxDailyForAgent: number | null;
}
export declare function slotId(subServiceId: string, agentId: string, date: string, startTime: string): string;
export declare function computeSlots(db: Db, subServiceId: string, date: string, filterAgentId?: string): Promise<RawSlot[]>;
export interface PublicSlot {
    date: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
}
export declare function listPublicSlots(db: Db, params: {
    subServiceId: string;
    date: string;
}): Promise<PublicSlot[]>;
export declare function listAvailableDates(db: Db, params: {
    subServiceId: string;
    days?: number;
}): Promise<string[]>;
type RendezVousRow = typeof rendezVous.$inferSelect;
declare function nextTicketId(db: Pick<Db, "select">, date: string, prefix: "RDV" | "URG"): Promise<string>;
export { nextTicketId };
export declare function bookForUser(db: Db, params: {
    userId: string;
    subServiceId: string;
    date: string;
    startTime: string;
    motif?: string | null;
    demandeId?: string | null;
    ip?: string | null;
}): Promise<RendezVousRow>;
export interface OwnRendezVous {
    row: RendezVousRow;
    startTime: string;
    endTime: string;
    subService: {
        id: string;
        name: string;
        serviceName: string | null;
        isCultural: boolean;
    } | null;
    advisor: {
        name: string;
        title: string;
    } | null;
    canModify: boolean;
}
export declare function listByUser(db: Db, userId: string): Promise<OwnRendezVous[]>;
export declare function getOwned(db: Db, userId: string, id: string): Promise<OwnRendezVous>;
export declare function listNotesForUser(db: Db, userId: string, id: string): Promise<{
    id: string;
    rendezVousId: string;
    authorId: string;
    authorName: string | null;
    authorType: string;
    content: string;
    isInternal: boolean | null;
    createdAt: Date | null;
}[]>;
export declare function addNoteByUser(db: Db, params: {
    userId: string;
    id: string;
    content: string;
    ip?: string | null;
}): Promise<{
    id: string;
    createdAt: Date | null;
    authorId: string;
    authorName: string | null;
    authorType: string;
    content: string;
    isInternal: boolean | null;
    rendezVousId: string;
}>;
export declare function cancelByUser(db: Db, params: {
    userId: string;
    id: string;
    reason?: string | null;
    ip?: string | null;
}): Promise<OwnRendezVous>;
export declare function rescheduleByUser(db: Db, params: {
    userId: string;
    id: string;
    date: string;
    startTime: string;
    ip?: string | null;
}): Promise<OwnRendezVous>;
export declare const isSlotConflict: typeof isUniqueViolation;
//# sourceMappingURL=rendezvous.d.ts.map