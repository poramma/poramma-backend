import { z } from "zod";

export const createUserDto = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const updatePersonalInfoDto = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE"]).optional(),
  bio: z.string().optional(),
  birthDate: z.string().optional(),
});

export const updateAddressDto = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
});

export const updateStudentProfileDto = z.object({
  university: z.string().optional(),
  faculty: z.string().optional(),
  studyLevel: z.string().optional(),
  scholarship: z
    .object({
      isRecipient: z.boolean(),
      decisionNumber: z.string().optional(),
      promotion: z.string().optional(),
    })
    .optional(),
});

export const updateWorkerProfileDto = z.object({
  employer: z.string().optional(),
  profession: z.string().optional(),
  contractType: z.string().optional(),
});


export const updateUserStatusDto = z.object({
    status: z.enum(["UNVERIFIED", "PENDING", "VERIFIED", "SUSPENDED"]),
  });