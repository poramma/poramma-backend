import crypto from "crypto";
import { markAudited } from "@poramma/utils";
import type { Db } from "../db-type";
import { auditLogs } from "../schema/audit";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

interface Actor {
  userId: string;
  roleName: string | null;
}

/**
 * Journal d'audit général, multi-entités — appelé par ambassade-api ET
 * communaute-api (RÈGLE-08 : toute mutation côté citoyen doit être auditée
 * aussi). identity-api garde sa propre copie locale (voir son
 * shared/audit-write.ts), même table, cross-schema write.
 */
export async function writeAudit(
  db: Db,
  params: {
    action: string;
    entityType: string;
    entityId: string;
    actor: Actor | null;
    result?: "SUCCESS" | "ERROR" | "REJECT" | "WARNING";
    severity?: "INFO" | "WARNING" | "CRITICAL";
    entitySnapshot?: Record<string, unknown> | null;
    details?: Record<string, unknown> | null;
    ip?: string | null;
    ua?: string | null;
    sessionId?: string | null;
    /** Passe la transaction active pour que l'audit soit atomique avec la mutation qu'il documente. */
    tx?: Pick<Db, "insert">;
  }
) {
  markAudited();
  const conn = params.tx ?? db;
  await conn.insert(auditLogs).values({
    id: newId("aud"),
    actorUserId: params.actor?.userId ?? null,
    actorRole: params.actor?.roleName ?? null,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    entitySnapshot: params.entitySnapshot ?? null,
    result: params.result ?? "SUCCESS",
    details: params.details ?? null,
    ip: params.ip ?? null,
    ua: params.ua ?? null,
    sessionId: params.sessionId ?? null,
    severity: params.severity ?? "INFO",
  });
}
