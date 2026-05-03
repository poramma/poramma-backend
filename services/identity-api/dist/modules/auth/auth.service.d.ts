export declare function register(email: string, password: string, firstName: string, lastName: string): Promise<{
    email: string;
    firstName: string;
    lastName: string;
    status: string | null;
    id: string;
    passwordHash: string;
    emailVerified: boolean | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}>;
export declare function verifyOtp(email: string, otp: string): Promise<{
    success: boolean;
}>;
export declare function login(email: string, password: string): Promise<{
    accessToken: string;
    refreshToken: string;
}>;
export declare function refresh(refreshToken: string): Promise<{
    accessToken: string;
}>;
export declare function logout(userId: string): Promise<void>;
export declare function getProfile(userId: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    emailVerified: boolean | null;
    status: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}>;
export declare function updateProfile(userId: string, data: any): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    emailVerified: boolean | null;
    status: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}>;
//# sourceMappingURL=auth.service.d.ts.map