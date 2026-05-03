import { z } from "zod";

// Registration
export const registerDto = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string(),
  lastName: z.string(),
});

// OTP Verification
export const verifyOtpDto = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});

// Login
export const loginDto = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
