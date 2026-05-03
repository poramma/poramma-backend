export declare function register(email: string, password: string, firstName: string, lastName: string): Promise<{
    profile: {
        firstName: string;
        lastName: string;
        userType: string;
        city: string | null;
        id: string;
        createdAt: Date | null;
        updatedAt: Date | null;
        userId: string;
        inue: string | null;
        bio: string | null;
        birthDate: Date | null;
        address: string | null;
        country: string | null;
        zipCode: string | null;
        gender: string | null;
    };
    email: string;
    status: string | null;
    phone: string | null;
    id: string;
    emailVerified: boolean | null;
    phoneVerified: boolean | null;
    passwordHash: string;
    createdAt: Date | null;
    updatedAt: Date | null;
}>;
export declare function checkUser(email: string): Promise<boolean>;
export declare function saveOpt(email: string, otp: string): Promise<void>;
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
    phone: string | null;
    emailVerified: boolean | null;
    phoneVerified: boolean | null;
    status: string | null;
    passwordHash: string;
    createdAt: Date | null;
    updatedAt: Date | null;
}>;
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
//# sourceMappingURL=auth.service.d.ts.map