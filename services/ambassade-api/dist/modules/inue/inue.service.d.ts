interface Actor {
    userId: string;
    roleName: string | null;
}
export declare function formatInue(year: number, sequence: number): string;
export declare function assignInue(etudiantId: string, year: number, actor: Actor): Promise<{
    inue: string;
    year: number;
    sequence: number;
}>;
export {};
//# sourceMappingURL=inue.service.d.ts.map