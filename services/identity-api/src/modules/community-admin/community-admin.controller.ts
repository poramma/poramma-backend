import { Request, Response } from "express";
import { z } from "zod";
import { ok } from "@poramma/dto";
import { ValidationError } from "@poramma/utils";
import * as svc from "./community-admin.service";

const statusDto = z.object({
  status: z.enum(["SUSPENDED", "ACTIVE"]),
  reason: z.string().trim().max(500).optional(),
});
const addDto = z.object({ email: z.string().trim().email("Email invalide").max(255), role: z.enum(svc.TEAM_ROLES) });
const roleDto = z.object({ role: z.enum(svc.TEAM_ROLES) });
const idDto = z.string().uuid("Identifiant invalide");

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new ValidationError("Données invalides", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  return parsed.data;
}

const callerOf = (req: Request) => ({ userId: (req as any).userId as string, roleName: ((req as any).roleName as string | null) ?? null });
const uaOf = (req: Request) => (typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : null);

/** PATCH /community-admin/members/:id/status */
export async function setMemberStatus(req: Request, res: Response) {
  const id = parse(idDto, req.params.id);
  const body = parse(statusDto, req.body);
  const result = await svc.setMemberStatus(id, body.status, callerOf(req), body.reason ?? null, req.ip, uaOf(req));
  res.json(ok(result, undefined, body.status === "SUSPENDED" ? "Compte suspendu : toutes ses sessions sont fermées." : "Compte réactivé."));
}

/** GET /community-admin/team */
export async function listTeam(_req: Request, res: Response) {
  res.json(ok(await svc.listTeam()));
}

/** POST /community-admin/team */
export async function addTeamMember(req: Request, res: Response) {
  const body = parse(addDto, req.body);
  res.status(201).json(ok(await svc.addTeamMember(body.email, body.role, callerOf(req), req.ip, uaOf(req)), undefined, "Membre ajouté à l'équipe."));
}

/** PATCH /community-admin/team/:userId */
export async function changeTeamRole(req: Request, res: Response) {
  const body = parse(roleDto, req.body);
  res.json(ok(await svc.changeTeamRole(parse(idDto, req.params.userId), body.role, callerOf(req), req.ip, uaOf(req)), undefined, "Rôle modifié : la personne devra se reconnecter."));
}

/** DELETE /community-admin/team/:userId */
export async function removeTeamMember(req: Request, res: Response) {
  await svc.removeTeamMember(parse(idDto, req.params.userId), callerOf(req), req.ip, uaOf(req));
  res.json(ok(null, undefined, "Membre retiré de l'équipe."));
}
