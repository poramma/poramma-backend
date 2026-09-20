import crypto from "crypto";
import { db } from "../../db/connection";
import { agentServiceAssignments, agentAvailabilities, agentExceptions } from "../../db/schema.rendezvous";
import { subServices, services } from "../../db/schema.ambassade";
import { eq, and, ne, gte } from "drizzle-orm";
import { NotFoundError, ValidationError } from "@poramma/utils";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** [aStart,aEnd) chevauche [bStart,bEnd) ? */
function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Une ligne (dispo ou exception) avec validFrom/validUntil est-elle effective à cette date ? */
function withinValidity(date: string, validFrom: string | null | undefined, validUntil: string | null | undefined): boolean {
  if (validFrom && date < validFrom) return false;
  if (validUntil && date > validUntil) return false;
  return true;
}

async function attachSubService(assignment: typeof agentServiceAssignments.$inferSelect) {
  const [sub] = await db.select().from(subServices).where(eq(subServices.id, assignment.subServiceId));
  const service = sub ? (await db.select().from(services).where(eq(services.id, sub.serviceId)))[0] : undefined;
  return { ...assignment, subService: sub ? { ...sub, basePrice: sub.basePrice != null ? Number(sub.basePrice) : null, service } : null };
}

/** GET /agents/:id/assignments */
export async function listAssignments(agentId: string) {
  const rows = await db.select().from(agentServiceAssignments).where(eq(agentServiceAssignments.agentId, agentId));
  return Promise.all(rows.map(attachSubService));
}

/** POST /agents/:id/assignments — mission prompt SVC-04, ADMIN uniquement (gated côté routes). */
export async function createAssignment(
  agentId: string,
  data: {
    subServiceId: string;
    validFrom?: string | null;
    validUntil?: string | null;
    isPrimary?: boolean;
    maxDailyAppointments?: number | null;
    notes?: string | null;
  },
  assignedBy: string
) {
  const [sub] = await db.select().from(subServices).where(eq(subServices.id, data.subServiceId));
  if (!sub) throw new NotFoundError("Sous-service introuvable");

  const [row] = await db
    .insert(agentServiceAssignments)
    .values({ id: newId("asg"), agentId, assignedBy, ...data })
    .returning();
  return attachSubService(row);
}

export async function updateAssignment(
  assignmentId: string,
  data: Partial<{
    subServiceId: string;
    validFrom: string | null;
    validUntil: string | null;
    isPrimary: boolean;
    maxDailyAppointments: number | null;
    notes: string | null;
    active: boolean;
  }>
) {
  const [existing] = await db.select().from(agentServiceAssignments).where(eq(agentServiceAssignments.id, assignmentId));
  if (!existing) throw new NotFoundError("Affectation introuvable");

  const [updated] = await db
    .update(agentServiceAssignments)
    .set(data)
    .where(eq(agentServiceAssignments.id, assignmentId))
    .returning();
  return attachSubService(updated);
}

export async function deleteAssignment(assignmentId: string) {
  const [existing] = await db.select().from(agentServiceAssignments).where(eq(agentServiceAssignments.id, assignmentId));
  if (!existing) throw new NotFoundError("Affectation introuvable");
  await db.delete(agentServiceAssignments).where(eq(agentServiceAssignments.id, assignmentId));
}

/**
 * GET /agents/:id/availabilities?date= — sans date, renvoie tout l'horaire
 * hebdomadaire récurrent (tous les jours). Avec une date, filtre chaque
 * jour à la version effective à cette date (validFrom/validUntil) — utile
 * pour vérifier "qu'est-ce qui s'applique vraiment le X", notamment quand
 * plusieurs versions d'un même jour se chevauchent dans le temps.
 */
export async function listAvailabilities(agentId: string, date?: string) {
  const rows = await db.select().from(agentAvailabilities).where(eq(agentAvailabilities.agentId, agentId));
  if (!date) return rows;
  return rows.filter((r) => withinValidity(date, r.validFrom, r.validUntil));
}

/**
 * Compare le créneau [startTime,endTime[ d'un jour donné aux disponibilités
 * déjà enregistrées pour ce même agent/jour (en excluant éventuellement une
 * ligne, pour une mise à jour). Lève une ValidationError sur doublon exact
 * (même jour, mêmes heures), retourne un avertissement non-bloquant sur
 * chevauchement partiel — "priorité aux plus récentes avec avertissement".
 */
async function checkAvailabilityOverlap(
  agentId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeId?: string
): Promise<string | undefined> {
  const rows = await db.select().from(agentAvailabilities).where(and(eq(agentAvailabilities.agentId, agentId), eq(agentAvailabilities.dayOfWeek, dayOfWeek)));
  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);
  let warning: string | undefined;
  for (const slot of rows) {
    if (excludeId && slot.id === excludeId) continue;
    if (!slot.startTime || !slot.endTime) continue;
    const exStart = timeToMinutes(slot.startTime);
    const exEnd = timeToMinutes(slot.endTime);
    if (exStart === newStart && exEnd === newEnd) {
      throw new ValidationError("Ce créneau de disponibilité existe déjà pour ce jour", { startTime: ["duplicate"] });
    }
    if (rangesOverlap(newStart, newEnd, exStart, exEnd)) {
      warning = "Ce créneau chevauche une disponibilité déjà enregistrée pour ce jour — la plus récente est prioritaire.";
    }
  }
  return warning;
}

/** POST /agents/:id/availabilities */
export async function createAvailability(
  agentId: string,
  data: {
    dayOfWeek: number;
    startTime?: string | null;
    endTime?: string | null;
    isAvailable?: boolean;
    validFrom?: string | null;
    validUntil?: string | null;
  }
) {
  const warning = data.startTime && data.endTime ? await checkAvailabilityOverlap(agentId, data.dayOfWeek, data.startTime, data.endTime) : undefined;

  const [row] = await db
    .insert(agentAvailabilities)
    .values({ id: newId("avl"), agentId, ...data })
    .returning();
  return warning ? { ...row, warning } : row;
}

/** PUT /agents/:id/availabilities/:availId */
export async function updateAvailability(availabilityId: string, data: Partial<typeof agentAvailabilities.$inferInsert>) {
  const [existing] = await db.select().from(agentAvailabilities).where(eq(agentAvailabilities.id, availabilityId));
  if (!existing) throw new NotFoundError("Disponibilité introuvable");

  const dayOfWeek = data.dayOfWeek ?? existing.dayOfWeek;
  const startTime = data.startTime !== undefined ? data.startTime : existing.startTime;
  const endTime = data.endTime !== undefined ? data.endTime : existing.endTime;
  const warning = startTime && endTime ? await checkAvailabilityOverlap(existing.agentId, dayOfWeek, startTime, endTime, availabilityId) : undefined;

  const [updated] = await db
    .update(agentAvailabilities)
    .set(data)
    .where(eq(agentAvailabilities.id, availabilityId))
    .returning();
  return warning ? { ...updated, warning } : updated;
}

export async function deleteAvailability(availabilityId: string) {
  const [existing] = await db.select().from(agentAvailabilities).where(eq(agentAvailabilities.id, availabilityId));
  if (!existing) throw new NotFoundError("Disponibilité introuvable");
  await db.delete(agentAvailabilities).where(eq(agentAvailabilities.id, availabilityId));
}

/**
 * GET /agents/:id/exceptions — sans filtre, tout l'historique ; `date` = uniquement
 * l'exception de ce jour-là ; `from` = celles à partir de cette date (à venir),
 * la plus proche d'abord.
 */
export async function listExceptions(agentId: string, date?: string, from?: string) {
  const conditions = [eq(agentExceptions.agentId, agentId)];
  if (date) conditions.push(eq(agentExceptions.date, date));
  if (from) conditions.push(gte(agentExceptions.date, from));
  return db.select().from(agentExceptions).where(and(...conditions)).orderBy(agentExceptions.date);
}

/** POST /agents/:id/exceptions */
export async function createException(
  agentId: string,
  data: {
    date: string;
    type: string;
    reason: string;
    isFullDay?: boolean;
    startTime?: string | null;
    endTime?: string | null;
  },
  createdBy: string
) {
  if (data.date < todayISO()) {
    throw new ValidationError("La date de l'exception doit être aujourd'hui ou une date future", { date: ["must be present or future"] });
  }

  const isFullDay = data.isFullDay ?? true;
  const existing = await db.select().from(agentExceptions).where(and(eq(agentExceptions.agentId, agentId), eq(agentExceptions.date, data.date)));

  let warning: string | undefined;
  for (const exc of existing) {
    const excIsFullDay = Boolean(exc.isFullDay);
    const sameShape =
      exc.type === data.type &&
      excIsFullDay === isFullDay &&
      (isFullDay || (exc.startTime === (data.startTime ?? null) && exc.endTime === (data.endTime ?? null)));
    if (sameShape) {
      throw new ValidationError("Cette exception existe déjà pour cette date", { date: ["duplicate"] });
    }

    const overlaps =
      isFullDay ||
      excIsFullDay ||
      (!!data.startTime && !!data.endTime && !!exc.startTime && !!exc.endTime &&
        rangesOverlap(timeToMinutes(data.startTime), timeToMinutes(data.endTime), timeToMinutes(exc.startTime), timeToMinutes(exc.endTime)));
    if (overlaps) {
      warning = "Cette exception chevauche une autre exception déjà enregistrée pour cette date — la plus récente est prioritaire.";
    }
  }

  const [row] = await db
    .insert(agentExceptions)
    .values({ id: newId("exc"), agentId, createdBy, ...data })
    .returning();
  return warning ? { ...row, warning } : row;
}

/** DELETE /agents/exceptions/:excId */
export async function deleteException(exceptionId: string) {
  const [existing] = await db.select().from(agentExceptions).where(eq(agentExceptions.id, exceptionId));
  if (!existing) throw new NotFoundError("Exception introuvable");
  await db.delete(agentExceptions).where(eq(agentExceptions.id, exceptionId));
}
