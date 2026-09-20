import { z } from "zod";

export const createRoleDto = z.object({
  name: z.string().min(2).max(50),
  description: z.string().min(1),
  level: z.number().int().min(1).max(100),
  isSystem: z.boolean().optional(),
});

export const updateRoleDto = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().min(1).optional(),
  level: z.number().int().min(1).max(100).optional(),
});

export const assignPermissionDto = z.object({
  permissionCode: z.string().min(1),
});

export const assignRoleToUserDto = z.object({
  roleId: z.string().uuid(),
});
