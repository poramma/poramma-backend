export interface GoogleIdentity {
    sub: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    picture: string | null;
}
export declare function googleClientIds(): string[];
export declare function isGoogleConfigured(): boolean;
export declare function resetGoogleKeyCache(): void;
export declare function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity>;
//# sourceMappingURL=google.d.ts.map