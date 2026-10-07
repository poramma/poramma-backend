import { Request, Response } from "express";
import { ok, paginationMeta } from "@poramma/dto";
import { NotFoundError, ValidationError } from "@poramma/utils";
import { auditLogic, supportLogic } from "@poramma/ambassade-core";
import { db } from "../../db/connection";
import { sanitizeText } from "../../shared/sanitize";
import * as svc from "./admin.service";

// Le support et l'audit de cette administration ne voient que la plateforme
// communautaire : le domaine/destinataire est figé ici, jamais lu d'une requête.
const DOMAIN = "COMMUNITY" as const;
const TARGET = "COMMUNITY" as const;

const actorOf = (req: Request) => ({ userId: (req as any).userId as string, roleName: ((req as any).roleName as string | null) ?? null });
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined => (typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : undefined);
const int = (v: unknown, fallback: number, max: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : fallback;
};
const uuidOk = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// ── Tableau de bord, supervision ─────────────────────────────────────────

export async function overview(_req: Request, res: Response) {
  res.json(ok(await svc.overview()));
}

export async function systemStatus(_req: Request, res: Response) {
  res.json(ok(await svc.systemStatus()));
}

// ── Membres ──────────────────────────────────────────────────────────────

export async function listMembers(req: Request, res: Response) {
  const page = int(req.query.page, 1, 100000);
  const limit = int(req.query.limit, 20, 100);
  const { data, total } = await svc.listMembers({
    search: str(req.query.search),
    status: oneOf(req.query.status, ["VERIFIED", "UNVERIFIED", "SUSPENDED"] as const),
    userType: oneOf(req.query.userType, ["student", "worker", "other"] as const),
    registration: oneOf(req.query.registration, ["PENDING", "VALIDATED", "REJECTED", "SUSPENDED", "NONE"] as const),
    page,
    limit,
  });
  res.json(ok(data, paginationMeta(page, limit, total)));
}

export async function getMember(req: Request, res: Response) {
  if (!uuidOk(req.params.id)) throw new NotFoundError("Membre introuvable");
  res.json(ok(await svc.getMember(req.params.id)));
}

// ── Journal d'audit de la communauté ─────────────────────────────────────

function auditFilters(src: Record<string, unknown>): auditLogic.AuditFilters {
  return {
    actorUserId: uuidOk(src.actorUserId) ? src.actorUserId : undefined,
    actorRole: str(src.actorRole),
    action: str(src.action),
    entityType: str(src.entityType),
    entityId: str(src.entityId),
    result: oneOf(src.result, ["SUCCESS", "ERROR", "REJECT", "WARNING"] as const),
    severity: oneOf(src.severity, ["INFO", "WARNING", "CRITICAL"] as const),
    dateFrom: str(src.dateFrom),
    dateTo: str(src.dateTo),
    search: str(src.search),
    page: int(src.page, 1, 100000),
    limit: int(src.limit, 25, 200),
  };
}

export async function listAuditLogs(req: Request, res: Response) {
  const { data, total, page, limit } = await auditLogic.listLogs(db, DOMAIN, auditFilters(req.query));
  res.json(ok(data, paginationMeta(page, limit, total)));
}

export async function getAuditLog(req: Request, res: Response) {
  const log = await auditLogic.getLog(db, DOMAIN, req.params.id);
  if (!log) throw new NotFoundError("Entrée d'audit introuvable");
  res.json(ok(log));
}

export async function auditStats(_req: Request, res: Response) {
  res.json(ok(await auditLogic.getStats(db, DOMAIN)));
}

export async function exportAuditLogs(req: Request, res: Response) {
  const filters = auditFilters((req.body?.filters ?? {}) as Record<string, unknown>);
  const format = req.body?.format === "JSON" ? "JSON" : "CSV";

  // L'export de données personnelles est lui-même une action sensible : tracée.
  await auditLogic.writeAudit(db, {
    action: "EXPORT",
    entityType: "AUDIT",
    entityId: "-",
    actor: actorOf(req),
    severity: "WARNING",
    details: { format, domain: DOMAIN },
    ip: req.ip,
    ua: req.headers["user-agent"] ?? null,
  });

  if (format === "JSON") {
    const { data } = await auditLogic.listLogs(db, DOMAIN, { ...filters, page: 1, limit: 5000 });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="audit-communaute-${Date.now()}.json"`);
    res.send(JSON.stringify(data, null, 2));
    return;
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="audit-communaute-${Date.now()}.csv"`);
  res.send(await auditLogic.exportLogsAsCsv(db, DOMAIN, filters));
}

// ── Support de la communauté ─────────────────────────────────────────────

export async function listTickets(req: Request, res: Response) {
  const page = int(req.query.page, 1, 100000);
  const limit = int(req.query.limit, 20, 100);
  const { data, total, stats } = await supportLogic.listTickets(db, TARGET, actorOf(req).userId, {
    status: oneOf(req.query.status, ["ACTIVE", ...supportLogic.TICKET_STATUSES] as const),
    category: oneOf(req.query.category, supportLogic.TICKET_CATEGORIES),
    priority: oneOf(req.query.priority, supportLogic.TICKET_PRIORITIES),
    assigned: str(req.query.assigned),
    search: str(req.query.search),
    page,
    limit,
  });
  // `stats` = compteurs par statut pour les pastilles de la file (en plus de la pagination).
  const meta = { ...paginationMeta(page, limit, total), stats };
  res.json(ok(data, meta));
}

export async function listAssignees(_req: Request, res: Response) {
  res.json(ok(await supportLogic.listAssignees(db, TARGET)));
}

export async function getTicket(req: Request, res: Response) {
  res.json(ok(await supportLogic.getTicketForStaff(db, TARGET, req.params.id)));
}

export async function addTicketMessage(req: Request, res: Response) {
  const content = typeof req.body?.content === "string" ? sanitizeText(req.body.content) : "";
  if (content.length < 1 || content.length > 3000) throw new ValidationError("Données invalides", { content: ["Le message doit contenir entre 1 et 3000 caractères"] });
  const internal = req.body?.isInternal === true;
  const actor = actorOf(req);
  const ticket = await supportLogic.addStaffMessage(db, TARGET, req.params.id, actor.userId, content, internal);
  await auditLogic.writeAudit(db, {
    action: internal ? "NOTE" : "COMMENT",
    entityType: "TICKET_SUPPORT",
    entityId: req.params.id,
    actor,
    details: { reference: ticket.reference, internal },
    ip: req.ip,
    ua: req.headers["user-agent"] ?? null,
  });
  res.status(201).json(ok(ticket, undefined, internal ? "Note interne ajoutée." : "Réponse envoyée au membre."));
}

export async function updateTicket(req: Request, res: Response) {
  const status = oneOf(req.body?.status, supportLogic.TICKET_STATUSES);
  const priority = oneOf(req.body?.priority, supportLogic.TICKET_PRIORITIES);
  const hasAssignee = req.body && Object.prototype.hasOwnProperty.call(req.body, "assignedTo");
  const assignedTo = hasAssignee ? (req.body.assignedTo === null ? null : uuidOk(req.body.assignedTo) ? req.body.assignedTo : undefined) : undefined;
  if (hasAssignee && assignedTo === undefined) throw new ValidationError("Données invalides", { assignedTo: ["Identifiant invalide"] });
  if (status === undefined && priority === undefined && !hasAssignee) throw new ValidationError("Données invalides", { body: ["Aucune modification demandée"] });

  const actor = actorOf(req);
  const before = await supportLogic.getTicketForStaff(db, TARGET, req.params.id);
  const ticket = await supportLogic.updateTicket(db, TARGET, req.params.id, actor.userId, { status, priority, assignedTo });
  await auditLogic.writeAudit(db, {
    action: hasAssignee && status === undefined ? "ASSIGN" : "UPDATE_STATUS",
    entityType: "TICKET_SUPPORT",
    entityId: req.params.id,
    actor,
    severity: status === "CLOSED" ? "WARNING" : "INFO",
    entitySnapshot: {
      from: { status: before.status, priority: before.priority, assignee: before.assignee?.name ?? null },
      to: { status: ticket.status, priority: ticket.priority, assignee: ticket.assignee?.name ?? null },
    },
    details: { reference: ticket.reference },
    ip: req.ip,
    ua: req.headers["user-agent"] ?? null,
  });
  res.json(ok(ticket));
}
