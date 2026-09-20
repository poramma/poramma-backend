import type { Readable } from "stream";
export declare function initStorage(): void;
export declare function ensureBucket(): Promise<void>;
export interface UploadResult {
    key: string;
    size: number;
}
export declare function uploadObject(key: string, body: Buffer, contentType: string): Promise<UploadResult>;
export interface StoredObject {
    buffer: Buffer;
    contentType?: string;
}
export declare function getObject(key: string): Promise<StoredObject>;
export interface StoredObjectStream {
    stream: Readable;
    contentType?: string;
    contentLength?: number;
    contentRange?: string;
}
export declare function getObjectStream(key: string, range?: string): Promise<StoredObjectStream>;
export declare function deleteObject(key: string): Promise<void>;
//# sourceMappingURL=index.d.ts.map