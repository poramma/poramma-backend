"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileDto = exports.refreshDto = exports.loginDto = exports.verifyOtpDto = exports.registerDto = void 0;
const zod_1 = require("zod");
exports.registerDto = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    firstName: zod_1.z.string(),
    lastName: zod_1.z.string(),
});
exports.verifyOtpDto = zod_1.z.object({
    email: zod_1.z.string().email(),
    otp: zod_1.z.string().length(6),
});
exports.loginDto = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
exports.refreshDto = zod_1.z.object({
    refreshToken: zod_1.z.string(),
});
exports.updateProfileDto = zod_1.z.object({
    userType: zod_1.z.enum(["student", "worker", "migrant", "other"]),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
});
//# sourceMappingURL=dto.js.map