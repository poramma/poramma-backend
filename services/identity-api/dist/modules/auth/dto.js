"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordDto = exports.forgotPasswordDto = exports.switchRoleDto = exports.updateProfileDto = exports.refreshDto = exports.loginDto = exports.verifyOtpDto = exports.registerDto = void 0;
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
    password: zod_1.z.string().min(8),
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    phone: zod_1.z.string().optional(),
});
exports.loginDto = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
    rememberMe: zod_1.z.boolean().optional(),
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
exports.switchRoleDto = zod_1.z.object({
    roleId: zod_1.z.string().uuid(),
});
exports.forgotPasswordDto = zod_1.z.object({
    email: zod_1.z.string().email(),
});
exports.resetPasswordDto = zod_1.z.object({
    email: zod_1.z.string().email(),
    otp: zod_1.z.string().length(6),
    newPassword: zod_1.z
        .string()
        .min(8, "Le mot de passe doit contenir au moins 8 caractères")
        .max(128)
        .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre")
        .regex(/\d/, "Le mot de passe doit contenir au moins un chiffre"),
});
//# sourceMappingURL=dto.js.map