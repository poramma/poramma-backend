interface AuthResponse {
    accessToken: string;
    refreshToken: string;
    user: FullUser;
}
export interface FullUser {
    id: string;
    email: string;
    phone: string | null;
    emailVerified: boolean;
    phoneVerified: boolean;
    status: string;
    mfaEnabled: boolean;
    lastLoginAt: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    profile: any;
    roles: any[];
    activeRole: any;
    permissions: string[];
}
export declare function buildFullUser(userId: string): Promise<FullUser>;
export declare function register(email: string, password: string, firstName: string, lastName: string): Promise<{
    profile: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        userType: string | null;
        city: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
        userId: string;
        inue: string | null;
        bio: string | null;
        birthDate: string | null;
        nationality: string | null;
        address: string | null;
        country: string | null;
        zipCode: string | null;
        gender: string | null;
    };
    id: string;
    email: string;
    status: string | null;
    phone: string | null;
    emailVerified: boolean | null;
    phoneVerified: boolean | null;
    passwordHash: string;
    createdAt: Date | null;
    updatedAt: Date | null;
}>;
export declare function checkUser(email: string): Promise<boolean>;
export declare function saveOpt(email: string, otp: string): Promise<void>;
export declare function verifyOtp(email: string, otp: string, password: string, firstName: string, lastName: string, phone?: string | null): Promise<{
    success: boolean;
    user: {
        id: string;
        email: string;
    };
}>;
export declare function login(email: string, password: string, ip?: string | null, ua?: string | null, rememberMe?: boolean): Promise<AuthResponse>;
export declare function refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
}>;
export declare function logout(userId: string, sessionId?: string): Promise<void>;
export declare function getProfile(userId: string): Promise<FullUser>;
export declare function updateProfile(userId: string, data: any): Promise<{
    id: string;
    email: string;
    phone: string | null;
    emailVerified: boolean | null;
    phoneVerified: boolean | null;
    status: string | null;
    passwordHash: string;
    createdAt: Date | null;
    updatedAt: Date | null;
}>;
export declare function listSystemRoles(): Promise<{
    id: string;
    name: string;
    description: string | null;
    level: number;
    isSystem: boolean | null;
}[]>;
export declare function getMyPermissions(userId: string): Promise<string[]>;
export declare function switchRole(userId: string, sessionId: string, roleId: string): Promise<{
    accessToken: string;
    user: FullUser;
}>;
export declare function createPasswordResetCode(email: string): Promise<{
    email: string;
    firstName: string | null;
    code: string;
} | null>;
export declare function resetPasswordWithCode(params: {
    email: string;
    code: string;
    newPassword: string;
    ip?: string | null;
    ua?: string | null;
}): Promise<{
    email: string;
}>;
export {};
//# sourceMappingURL=auth.service.d.ts.map