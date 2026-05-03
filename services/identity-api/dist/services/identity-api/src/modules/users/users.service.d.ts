export declare function getUserById(id: string): Promise<{
    profile: {
        id: string;
        userId: string;
        inue: string | null;
        userType: string;
        firstName: string;
        lastName: string;
        bio: string | null;
        birthDate: Date | null;
        address: string | null;
        city: string | null;
        country: string | null;
        zipCode: string | null;
        gender: string | null;
        createdAt: Date | null;
        updatedAt: Date | null;
    };
    student: {
        id: string;
        userId: string;
        university: string | null;
        faculty: string | null;
        studyLevel: string | null;
    };
    worker: {
        id: string;
        userId: string;
        employer: string | null;
        profession: string | null;
        contractType: string | null;
    };
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
export declare function getUserProfile(userId: string): Promise<{
    id: string;
    email: string;
    status: string | null;
    inue: string | null;
    userType: string;
    personalInfo: {
        firstName: string;
        lastName: string;
        phone: string;
        gender: string;
    };
    address: {
        address: string;
        city: string;
        country: string;
        zipCode: string;
    };
    studentProfile: {
        university: string | null;
        faculty: string | null;
        studyLevel: string | null;
        scholarship: {
            isRecipient: any;
            decisionNumber: any;
            promotion: any;
        } | undefined;
    } | undefined;
    workerProfile: {
        employer: string | null;
        profession: string | null;
        contractType: string | null;
    } | undefined;
    documents: any[];
    logs: any[];
}>;
export declare function updateUserStatus(userId: string, status: string): Promise<{
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
export declare function updatePersonalInfo(userId: string, data: any): Promise<{
    id: string;
    userId: string;
    inue: string | null;
    userType: string;
    firstName: string;
    lastName: string;
    bio: string | null;
    birthDate: Date | null;
    address: string | null;
    city: string | null;
    country: string | null;
    zipCode: string | null;
    gender: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}[]>;
export declare function updateAddress(userId: string, data: any): Promise<{
    id: string;
    userId: string;
    inue: string | null;
    userType: string;
    firstName: string;
    lastName: string;
    bio: string | null;
    birthDate: Date | null;
    address: string | null;
    city: string | null;
    country: string | null;
    zipCode: string | null;
    gender: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
}[]>;
export declare function updateStudentProfile(userId: string, data: any): Promise<{
    id: string;
    userId: string;
    university: string | null;
    faculty: string | null;
    studyLevel: string | null;
}>;
export declare function updateWorkerProfile(userId: string, data: any): Promise<{
    id: string;
    userId: string;
    employer: string | null;
    profession: string | null;
    contractType: string | null;
}[]>;
//# sourceMappingURL=users.service.d.ts.map