import { Request, Response } from "express";
import * as svc from "./demandes.service";
import { createDemandeDto, listDemandesQueryDto, updateStatusDto, assignDto, addCommentDto, validateRequirementDto } from "./dto";
import { ok } from "@poramma/dto";
import { ValidationError, ForbiddenError } from "@poramma/utils";
import { getAssignedSubServiceIds } from "../../shared/enrich";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

function actorOf(req: Request) {
  return { userId: (req as any).userId as string, roleName: (req as any).roleName as string | null };
}

function hasStaffReadAccess(req: Request): boolean {
  const permissions: string[] = (req as any).permissions || [];
  return permissions.includes("demande:read");
}

/** ADMIN a carte blanche (voir project memory rbac_hierarchy_decision) ; tout le reste du staff est scopé à ses services assignés. */
function isAdmin(req: Request): boolean {
  return (req as any).roleName === "ADMIN";
}

/**
 * L'accueil (RECEPTIONIST) oriente les usagers de TOUS les services : il consulte sans restriction de
 * service, mais ne traite ni ne commente (ces actions restent scopées, et sa permission ne les couvre pas).
 */
function canReadAllServices(req: Request): boolean {
  return isAdmin(req) || (req as any).roleName === "RECEPTIONIST";
}

/**
 * Espace d'échange demandeur ↔ agents : le staff avec demande:read voit
 * tout ; un demandeur non-staff (pas de rôle RBAC, ex: étudiant via
 * frontend-community, pas encore construit) ne peut accéder qu'à SON
 * PROPRE dossier. Utilisé sur les routes de détail/historique/
 * commentaires/exigences — pas sur la liste globale, qui reste staff-only.
 *
 * Un agent staff (non-ADMIN) ne peut accéder qu'aux demandes des
 * sous-services auxquels il est affecté (agent_service_assignments) — "voir
 * et traiter uniquement les services auxquels il est assigné".
 */
async function assertCanAccessDemande(req: Request, demandeId: string, write = false): Promise<boolean> {
  if (hasStaffReadAccess(req)) {
    if (!(write ? isAdmin(req) : canReadAllServices(req))) {
      const { subServiceId } = await svc.getDemandeAccessInfo(demandeId);
      const scope = await getAssignedSubServiceIds((req as any).userId);
      if (!scope.includes(subServiceId)) throw new ForbiddenError("Ce service ne vous est pas assigné");
    }
    return true;
  }
  const { userId: ownerId } = await svc.getDemandeAccessInfo(demandeId);
  if (ownerId !== (req as any).userId) throw new ForbiddenError("Accès non autorisé à cette demande");
  return false;
}

export async function listDemandes(req: Request, res: Response) {
  const parsed = listDemandesQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  if (!canReadAllServices(req)) {
    const scope = await getAssignedSubServiceIds((req as any).userId);
    if (parsed.data.subServiceId) {
      if (!scope.includes(parsed.data.subServiceId)) return res.json(ok([]));
    } else if (scope.length === 0) {
      return res.json(ok([]));
    } else {
      res.json(ok(await svc.listDemandes({ ...parsed.data, subServiceIds: scope })));
      return;
    }
  }

  res.json(ok(await svc.listDemandes(parsed.data)));
}

export async function getDemande(req: Request, res: Response) {
  await assertCanAccessDemande(req, req.params.id);
  res.json(ok(await svc.getDemande(req.params.id)));
}

export async function createDemande(req: Request, res: Response) {
  const parsed = createDemandeDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.status(201).json(ok(await svc.createDemande(parsed.data)));
}

/**
 * PATCH /demandes/:id/status — le prompt distingue "demande:validate"
 * (APPROVED), "demande:reject" (REJECTED) et "demande:update" (le reste :
 * IN_REVIEW, ADDITIONAL_INFO_REQUIRED, COMPLETED, ...). Le store frontend
 * fait passer toutes ces transitions par le même endpoint, donc la
 * permission requise est déterminée ici selon le statut cible plutôt qu'au
 * niveau du routeur.
 */
/** Lève 403 si le staff non-ADMIN n'est pas affecté au sous-service de cette demande. */
async function assertServiceScope(req: Request, demandeId: string): Promise<void> {
  if (isAdmin(req)) return;
  const { subServiceId } = await svc.getDemandeAccessInfo(demandeId);
  const scope = await getAssignedSubServiceIds((req as any).userId);
  if (!scope.includes(subServiceId)) throw new ForbiddenError("Ce service ne vous est pas assigné");
}

export async function updateStatus(req: Request, res: Response) {
  const parsed = updateStatusDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const permissions: string[] = (req as any).permissions || [];
  const requiredPermission =
    parsed.data.status === "APPROVED" ? "demande:validate" : parsed.data.status === "REJECTED" ? "demande:reject" : "demande:update";
  if (!permissions.includes(requiredPermission)) throw new ForbiddenError("Permission insuffisante");
  await assertServiceScope(req, req.params.id);

  res.json(ok(await svc.updateStatus(req.params.id, parsed.data, actorOf(req))));
}

export async function assignAgent(req: Request, res: Response) {
  const parsed = assignDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  await assertServiceScope(req, req.params.id);
  res.json(ok(await svc.assignAgent(req.params.id, parsed.data, actorOf(req))));
}

export async function listHistory(req: Request, res: Response) {
  const isStaff = await assertCanAccessDemande(req, req.params.id);
  const history = await svc.listHistory(req.params.id);
  res.json(ok(isStaff ? history : history.filter((h) => h.isVisibleToUser)));
}

export async function listComments(req: Request, res: Response) {
  const isStaff = await assertCanAccessDemande(req, req.params.id);
  const comments = await svc.listComments(req.params.id);
  res.json(ok(isStaff ? comments : comments.filter((c) => !c.isInternal)));
}

export async function addComment(req: Request, res: Response) {
  const parsed = addCommentDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const isStaff = await assertCanAccessDemande(req, req.params.id, true);
  const comment = await svc.addComment(req.params.id, parsed.data.content, parsed.data.isInternal ?? true, actorOf(req), isStaff);
  res.status(201).json(ok(comment));
}

export async function listRequirements(req: Request, res: Response) {
  await assertCanAccessDemande(req, req.params.id);
  res.json(ok(await svc.listRequirements(req.params.id)));
}

export async function listDemandeDocuments(req: Request, res: Response) {
  await assertCanAccessDemande(req, req.params.id);
  res.json(ok(await svc.listDemandeDocuments(req.params.id)));
}

export async function validateRequirement(req: Request, res: Response) {
  const parsed = validateRequirementDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  res.json(ok(await svc.validateRequirement(req.params.requirementId, parsed.data.status, parsed.data.note, actorOf(req))));
}
