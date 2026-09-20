import { Request, Response } from "express";
import * as rolesService from "./roles.service";
import { createRoleDto, updateRoleDto, assignPermissionDto, assignRoleToUserDto } from "./dto";
import { ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

export async function getRoles(_req: Request, res: Response) {
  res.json(ok(await rolesService.listRoles()));
}

export async function getRole(req: Request, res: Response) {
  res.json(ok(await rolesService.getRole(req.params.id)));
}

export async function createRole(req: Request, res: Response) {
  const parsed = createRoleDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const role = await rolesService.createRole(parsed.data);
  res.status(201).json(ok(role));
}

export async function updateRole(req: Request, res: Response) {
  const parsed = updateRoleDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const role = await rolesService.updateRole(req.params.id, parsed.data);
  res.json(ok(role));
}

export async function deleteRole(req: Request, res: Response) {
  await rolesService.deleteRole(req.params.id);
  res.status(204).send();
}

export async function getPermissions(_req: Request, res: Response) {
  res.json(ok(await rolesService.listPermissions()));
}

export async function assignPermissionToRole(req: Request, res: Response) {
  const parsed = assignPermissionDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  await rolesService.assignPermissionToRole(req.params.roleId, parsed.data.permissionCode);
  res.status(201).json(ok(null));
}

export async function removePermissionFromRole(req: Request, res: Response) {
  await rolesService.removePermissionFromRole(req.params.roleId, req.params.permissionCode);
  res.status(204).send();
}

export async function assignRoleToUser(req: Request, res: Response) {
  const parsed = assignRoleToUserDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const callerUserId = (req as any).userId;
  const assignment = await rolesService.assignRoleToUser(req.params.userId, parsed.data.roleId, callerUserId);
  res.status(201).json(ok(assignment));
}

export async function removeRoleFromUser(req: Request, res: Response) {
  const callerUserId = (req as any).userId;
  await rolesService.removeRoleFromUser(req.params.userId, req.params.roleId, callerUserId);
  res.status(204).send();
}
