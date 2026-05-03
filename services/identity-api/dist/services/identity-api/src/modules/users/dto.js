"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserStatusDto = exports.updateWorkerProfileDto = exports.updateStudentProfileDto = exports.updateAddressDto = exports.updatePersonalInfoDto = exports.createUserDto = void 0;
const zod_1 = require("zod");
exports.createUserDto = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
});
exports.updatePersonalInfoDto = zod_1.z.object({
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    phone: zod_1.z.string().optional(),
    gender: zod_1.z.string().optional(),
});
exports.updateAddressDto = zod_1.z.object({
    address: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    zipCode: zod_1.z.string().optional(),
});
exports.updateStudentProfileDto = zod_1.z.object({
    university: zod_1.z.string().optional(),
    faculty: zod_1.z.string().optional(),
    studyLevel: zod_1.z.string().optional(),
    scholarship: zod_1.z
        .object({
        isRecipient: zod_1.z.boolean(),
        decisionNumber: zod_1.z.string().optional(),
        promotion: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.updateWorkerProfileDto = zod_1.z.object({
    employer: zod_1.z.string().optional(),
    profession: zod_1.z.string().optional(),
    contractType: zod_1.z.string().optional(),
});
exports.updateUserStatusDto = zod_1.z.object({
    status: zod_1.z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "SUSPENDED"]),
});
//# sourceMappingURL=dto.js.map