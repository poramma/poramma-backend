import { type AuthResponse } from "./auth.service";
interface Ctx {
    ip?: string | null;
    ua?: string | null;
    rememberMe?: boolean;
}
export declare function signInWithGoogle(idToken: string, ctx?: Ctx): Promise<AuthResponse & {
    isNewUser: boolean;
}>;
export declare function linkGoogleToAccount(userId: string, idToken: string, ctx?: Ctx): Promise<{
    linked: boolean;
}>;
export declare function unlinkGoogle(userId: string, ctx?: Ctx): Promise<{
    linked: boolean;
}>;
export {};
//# sourceMappingURL=google-auth.service.d.ts.map