import crypto from "crypto";
import { markAudited } from "@poramma/utils";
import { and, eq } from "drizzle-orm";
import { db } from "../db/connection";
import { auditLogs } from "../db/schema.audit-write";
import { agents, roles, userRoles } from "../db/schema.identity";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

interface Actor {
  userId: string | null;
  roleName: string | null;
}

export type AuditDomain = "EMBASSY" | "COMMUNITY";

const DOMAIN_TTL_MS = 60_000;
const DOMAIN_CACHE_MAX = 5_000;
const domainCache = new Map<string, { domain: AuditDomain; expires: number }>();

/**
 * Même règle que ambassade-core (services/audit.ts resolveDomain) : EMBASSY si
 * le compte est du personnel de l'ambassade (fiche agent OU rôle actif de
 * portée EMBASSY), COMMUNITY sinon. Un acteur inconnu reçoit `fallback`.
 * Les deux copies doivent rester synchronisées.
 */
export async function resolveAuditDomain(userId: string | null | undefined, fallback: AuditDomain = "EMBASSY"): Promise<AuditDomain> {
  if (!userId) return fallback;
  const hit = domainCache.get(userId);
  if (hit && hit.expires > Date.now()) return hit.domain;

  const [agent] = await db.select({ id: agents.id }).from(agents).where(eq(agents.userId, userId)).limit(1);
  let domain: AuditDomain = agent ? "EMBASSY" : "COMMUNITY";
  if (!agent) {
    const [embassyRole] = await db
      .select({ id: userRoles.id })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(userRoles.userId, userId), eq(userRoles.isActive, true), eq(roles.scope, "EMBASSY")))
      .limit(1);
    if (embassyRole) domain = "EMBASSY";
  }

  if (domainCache.size >= DOMAIN_CACHE_MAX) domainCache.clear();
  domainCache.set(userId, { domain, expires: Date.now() + DOMAIN_TTL_MS });
  return domain;
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
  /** Forcer le domaine (sinon déduit de l'acteur ; un acteur inconnu retombe sur EMBASSY). */
  domain?: AuditDomain;
}) {
  markAudited();
  const domain = params.domain ?? (await resolveAuditDomain(params.actor.userId));
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
    domain,
  });
}
