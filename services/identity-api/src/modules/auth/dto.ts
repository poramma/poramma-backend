import { z } from "zod";

// Registration
export const registerDto = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string(),
  lastName: z.string(),
});

// OTP Verification — creates the account (see auth.service.ts's verifyOtp).
// Academic fields (university/faculty/studyLevel) are filled in afterward via
// PATCH /users/me/:id/student, not here — matches "step 8" of the public
// registration flow (sign in, then complete academic profile).
export const verifyOtpDto = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

// Login
export const loginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

// Refresh token
export const refreshDto = z.object({
  refreshToken: z.string(),
});

// Profile update
export const updateProfileDto = z.object({
  userType: z.enum(["student", "worker", "migrant", "other"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
});

// Switch active role
export const switchRoleDto = z.object({
  roleId: z.string().uuid(),
});

// Mot de passe oublié — la réponse à la demande est toujours la même, que le compte existe ou non.
export const forgotPasswordDto = z.object({
  email: z.string().email(),
});

export const resetPasswordDto = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(128)
    .regex(/[A-Za-z]/, "Le mot de passe doit contenir au moins une lettre")
    .regex(/\d/, "Le mot de passe doit contenir au moins un chiffre"),
});
