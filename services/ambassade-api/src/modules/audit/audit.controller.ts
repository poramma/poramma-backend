import { Request, Response } from "express";
import * as svc from "./audit.service";
import { listAuditLogsQueryDto, exportAuditLogsDto } from "./dto";
import { ok } from "@poramma/dto";
import { ValidationError, NotFoundError } from "@poramma/utils";

function zodDetails(error: any): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

export async function listLogs(req: Request, res: Response) {
  const parsed = listAuditLogsQueryDto.safeParse(req.query);
  if (!parsed.success) throw new ValidationError("Filtres invalides", zodDetails(parsed.error));

  const { data, meta } = await svc.listLogs(parsed.data);
  res.json(ok(data, meta));
}

export async function getLog(req: Request, res: Response) {
  const log = await svc.getLog(req.params.id);
  if (!log) throw new NotFoundError("Entrée d'audit introuvable");
  res.json(ok(log));
}

export async function getStats(req: Request, res: Response) {
  res.json(ok(await svc.getStats()));
}

export async function exportLogs(req: Request, res: Response) {
  const parsed = exportAuditLogsDto.safeParse(req.body);
  if (!parsed.success) throw new ValidationError("Données invalides", zodDetails(parsed.error));

  const { filters, format } = parsed.data;

  if (format === "JSON") {
    const { data: logs } = await svc.listLogs({ ...filters, page: 1, limit: 5000 });
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="audit-export-${Date.now()}.json"`);
    res.send(JSON.stringify(logs, null, 2));
    return;
  }

  // CSV par défaut (aussi utilisé pour un éventuel format "PDF" demandé —
  // aucun générateur PDF n'existe dans ce projet ; le frontend ne propose
  // volontairement plus cette option, voir JournalPage).
  const csv = await svc.exportLogsAsCsv(filters);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="audit-export-${Date.now()}.csv"`);
  res.send(csv);
}

/** GET /audit/me — l'activité de l'utilisateur connecté (aucune permission d'audit requise : chacun voit la sienne). */
export async function listMyActivity(req: Request, res: Response) {
  const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
  const limit = Math.min(Number(req.query.limit) > 0 ? Number(req.query.limit) : 20, 100);
  const { data, meta } = await svc.listMyActivity((req as any).userId as string, { page, limit });
  res.json(ok(data, meta));
}
