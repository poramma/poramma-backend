import crypto from "crypto";
import { markAudited } from "@poramma/utils";
import { db } from "../db/connection";
import { auditLogs } from "../db/schema.audit-write";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

interface Actor {
  userId: string | null;
  roleName: string | null;
}

/** See ambassade-api's modules/audit/audit.service.ts for the read side (GET /audit/*) and the header comment on schema.audit-write.ts for why this writes cross-schema. */
export async function writeAudit(params: {
  action: string;
  entityType: string;
  entityId: string;
  actor: Actor;
  result?: "SUCCESS" | "ERROR" | "REJECT" | "WARNING";
  severity?: "INFO" | "WARNING" | "CRITICAL";
  entitySnapshot?: Record<string, unknown> | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
  ua?: string | null;
  sessionId?: string | null;
}) {
  markAudited();
  await db.insert(auditLogs).values({
    id: newId("aud"),
    actorUserId: params.actor.userId,
    actorRole: params.actor.roleName,
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
