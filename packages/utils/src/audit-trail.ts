import { AsyncLocalStorage } from "async_hooks";
import type { NextFunction, Request, Response } from "express";

/**
 * Journal d'audit SYSTÉMATIQUE des actions de modification.
 *
 * Le code métier écrit des lignes d'audit riches (VALIDATE, REJECT, ASSIGN…)
 * pour ce qu'il sait décrire. Cela ne garantit pas que TOUTE action sensible
 * soit tracée (un endpoint oublié = une action invisible). Ce middleware comble
 * ce risque : pour chaque requête de modification authentifiée (POST / PUT /
 * PATCH / DELETE), si aucune ligne d'audit n'a été écrite pendant son traitement,
 * il en écrit une lui-même, dérivée de la route. Les refus (403) sont aussi
 * consignés : une tentative d'action interdite est un événement de sécurité.
 *
 * Aucun corps de requête n'est jamais enregistré (mots de passe, données
 * personnelles) — seulement la méthode, la route, le code de réponse.
 */
interface AuditState {
  audited: boolean;
}

const storage = new AsyncLocalStorage<AuditState>();

/** À appeler par tout écrivain d'audit : la requête en cours est réputée journalisée. */
export function markAudited(): void {
  const state = storage.getStore();
  if (state) state.audited = true;
}

export interface AuditTrailEntry {
  action: string;
  entityType: string;
  entityId: string;
  actor: { userId: string; roleName: string | null };
  result: "SUCCESS" | "ERROR" | "REJECT";
  severity: "INFO" | "WARNING" | "CRITICAL";
  details: Record<string, unknown>;
  ip: string | null;
  ua: string | null;
  sessionId: string | null;
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Segment de route → type d'entité affiché dans le journal (le PLUS SPÉCIFIQUE rencontré l'emporte). */
const ENTITY_BY_SEGMENT: Record<string, string> = {
  demandes: "DEMANDE",
  requirements: "EXIGENCE",
  "rendez-vous": "RENDEZ_VOUS",
  "agenda-slots": "RENDEZ_VOUS",
  etudiants: "ETUDIANT",
  inue: "INUE",
  documents: "DOCUMENT",
  "internal-documents": "DOCUMENT_INTERNE",
  campagnes: "CAMPAGNE",
  attachments: "PIECE_JOINTE_CAMPAGNE",
  services: "SERVICE",
  "sub-services": "SOUS_SERVICE",
  schedules: "HORAIRE_SERVICE",
  agents: "AGENT",
  assignments: "AFFECTATION_AGENT",
  availabilities: "DISPONIBILITE_AGENT",
  exceptions: "EXCEPTION",
  roles: "ROLE",
  permissions: "PERMISSION",
  users: "UTILISATEUR",
  threads: "FIL_MESSAGERIE",
  messages: "MESSAGE",
  notifications: "NOTIFICATION",
  profile: "PROFIL",
  "agent-requests": "DEMANDE_AGENT",
  auth: "AUTHENTIFICATION",
  audit: "AUDIT",
  payments: "PAIEMENT",
  comments: "COMMENTAIRE",
  notes: "NOTE",
};

/** Verbe de route (dernier segment statique) → action lisible. */
const ACTION_BY_VERB: Record<string, string> = {
  validate: "VALIDATE",
  reject: "REJECT",
  suspend: "SUSPEND",
  assign: "ASSIGN",
  "assign-inue": "ASSIGN_INUE",
  archive: "ARCHIVE",
  cancel: "CANCEL",
  send: "SEND",
  schedule: "SCHEDULE",
  duplicate: "DUPLICATE",
  reorder: "REORDER",
  resend: "RESEND",
  "resend-failed": "RESEND",
  "check-in": "CHECK_IN",
  complete: "COMPLETE",
  reprint: "REPRINT",
  "print-daily": "PRINT",
  urgence: "CREATE_URGENT",
  status: "UPDATE_STATUS",
  share: "SHARE",
  password: "CHANGE_PASSWORD",
  "reset-password": "RESET_PASSWORD",
  "forgot-password": "FORGOT_PASSWORD",
  "switch-role": "SWITCH_ROLE",
  logout: "LOGOUT",
  export: "EXPORT",
  enroll: "ENROLL",
  read: "READ",
  "read-all": "READ",
  process: "PROCESS",
};

const METHOD_ACTION: Record<string, string> = { POST: "CREATE", PUT: "UPDATE", PATCH: "UPDATE", DELETE: "DELETE" };

/** Actions qui méritent une sévérité supérieure quand elles sont détournées ou irréversibles. */
const WARNING_ACTIONS = new Set(["DELETE", "REJECT", "SUSPEND", "CANCEL", "ARCHIVE", "CHANGE_PASSWORD", "RESET_PASSWORD", "SWITCH_ROLE", "SEND", "EXPORT"]);

/** Ex. `/demandes/:id/assign` → { entityType: "DEMANDE", action: "ASSIGN", idParam: "id" }. */
export function deriveAuditTarget(method: string, routePath: string): { entityType: string; action: string; idParam?: string } {
  const segments = routePath.split("/").filter(Boolean);
  const statics = segments.filter((s) => !s.startsWith(":"));
  const params = segments.filter((s) => s.startsWith(":")).map((s) => s.slice(1));

  let entityType = "SYSTEME";
  for (const seg of statics) if (ENTITY_BY_SEGMENT[seg]) entityType = ENTITY_BY_SEGMENT[seg];

  // Dernier segment de la route : un verbe ("assign") s'il est statique et n'est pas lui-même le nom de l'entité.
  const last = segments[segments.length - 1];
  const verb = last && !last.startsWith(":") && !ENTITY_BY_SEGMENT[last] ? last : undefined;
  const action = (verb && ACTION_BY_VERB[verb]) ?? (verb ? verb.toUpperCase().replace(/-/g, "_") : METHOD_ACTION[method] ?? method);

  return { entityType, action, idParam: params[params.length - 1] };
}

export function auditTrail(options: {
  /** Écrit la ligne dans le journal (chaque service branche son propre écrivain). */
  write: (entry: AuditTrailEntry) => Promise<void>;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!MUTATING.has(req.method)) {
      next();
      return;
    }

    const state: AuditState = { audited: false };

    res.on("finish", () => {
      if (state.audited) return;
      const userId = (req as any).userId as string | undefined;
      if (!userId) return; // requête anonyme (connexion, inscription…) : journalisée par ses propres handlers

      const status = res.statusCode;
      // Refus d'accès = événement de sécurité ; succès = action réalisée ; les autres échecs (validation, conflit…) ne modifient rien.
      const isSuccess = status < 400;
      const isDenied = status === 403;
      if (!isSuccess && !isDenied) return;

      const routePath = `${req.baseUrl ?? ""}${req.route?.path ?? ""}`;
      const { entityType, action, idParam } = deriveAuditTarget(req.method, routePath);

      void options
        .write({
          action,
          entityType,
          entityId: (idParam && req.params?.[idParam]) || "-",
          actor: { userId, roleName: ((req as any).roleName as string | null) ?? null },
          result: isSuccess ? "SUCCESS" : "REJECT",
          severity: isDenied ? "WARNING" : WARNING_ACTIONS.has(action) ? "WARNING" : "INFO",
          details: { method: req.method, route: routePath, status, automatic: true },
          ip: req.ip ?? null,
          ua: (req.headers["user-agent"] as string | undefined) ?? null,
          sessionId: ((req as any).sessionId as string | undefined) ?? null,
        })
        .catch((err) => console.error("[audit-trail] écriture échouée :", (err as Error).message));
    });

    storage.run(state, () => next());
  };
}
