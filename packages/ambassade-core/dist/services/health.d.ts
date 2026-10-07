export interface Probe {
    ok: boolean;
    ms: number;
}
declare function timed(fn: () => Promise<unknown>): Promise<Probe>;
export declare function checkStorage(): Promise<Probe>;
export { timed as probe };
//# sourceMappingURL=health.d.ts.map