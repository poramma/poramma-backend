import type { Db } from "../db-type";
import { campagnes } from "../schema/campagnes";
import { storedFiles } from "../schema/documents";
type Campagne = typeof campagnes.$inferSelect;
type StoredFile = typeof storedFiles.$inferSelect;
export declare const REACTION_TYPES: readonly ["LIKE", "PARTICIPATE"];
export type ReactionType = (typeof REACTION_TYPES)[number];
export declare function isBroadcast(filters: unknown): boolean;
export interface CampagneItem {
    campagne: Campagne;
    cover: StoredFile | null;
    attachments: {
        id: string;
        type: string;
        caption: string | null;
        order: number;
        isBanner: boolean;
        file: StoredFile;
    }[];
    likes: number;
    participants: number;
    mine: {
        liked: boolean;
        participating: boolean;
    };
}
export declare function listForUser(db: Db, userId: string, opts?: {
    type?: string;
    limit?: number;
    offset?: number;
}): Promise<CampagneItem[]>;
export declare function getForUser(db: Db, userId: string, id: string): Promise<CampagneItem>;
export declare function getMediaFile(db: Db, userId: string, fileId: string): Promise<StoredFile>;
export declare function openMediaStream(file: {
    path: string;
}, range?: string): Promise<import("@poramma/storage").StoredObjectStream>;
export declare function recordView(db: Db, params: {
    userId: string;
    campagneId: string;
}): Promise<{
    recorded: boolean;
}>;
export declare function recordClick(db: Db, params: {
    userId: string;
    campagneId: string;
    targetId: string;
}): Promise<void>;
export declare function toggleReaction(db: Db, params: {
    userId: string;
    campagneId: string;
    type: ReactionType;
}): Promise<{
    active: boolean;
    count: number;
}>;
export interface InteractionStats {
    views: number;
    uniqueViewers: number;
    clicks: number;
    uniqueClickers: number;
    likes: number;
    participants: number;
    clicksByTarget: {
        targetId: string;
        count: number;
    }[];
}
export declare function interactionStats(db: Db, campagneIds: string[]): Promise<Map<string, InteractionStats>>;
export {};
//# sourceMappingURL=campagnes.d.ts.map