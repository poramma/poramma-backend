import crypto from "crypto";
import { eq, inArray, asc } from "drizzle-orm";
import { NotFoundError } from "@poramma/utils";
import type { Db } from "../db-type";
import { services, subServices, serviceSchedules, serviceExceptions, requirements } from "../schema/services";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function attachSubServices(db: Db, serviceRows: (typeof services.$inferSelect)[]) {
  if (serviceRows.length === 0) return serviceRows.map((s) => ({ ...s, subServices: [] as unknown[] }));

  const serviceIds = serviceRows.map((s) => s.id);
  const subRows = await db
    .select()
    .from(subServices)
    .where(inArray(subServices.serviceId, serviceIds))
    .orderBy(asc(subServices.name));

  const subIds = subRows.map((s) => s.id);
  const [scheduleRows, requirementRows] = subIds.length
    ? await Promise.all([
        db.select().from(serviceSchedules).where(inArray(serviceSchedules.subServiceId, subIds)),
        db.select().from(requirements).where(inArray(requirements.subServiceId, subIds)).orderBy(asc(requirements.order)),
      ])
    : [[], []];

  const serviceById = new Map(serviceRows.map((s) => [s.id, s]));

  const shapedSubs = subRows.map((sub) => ({
    ...sub,
    service: serviceById.get(sub.serviceId),
    schedules: scheduleRows.filter((sch) => sch.subServiceId === sub.id),
    requirements: requirementRows.filter((r) => r.subServiceId === sub.id),
  }));

  return serviceRows.map((s) => ({
    ...s,
    subServices: shapedSubs.filter((sub) => sub.serviceId === s.id),
  }));
}

/** GET /services — full tree (services → subServices → schedules/requirements). */
export async function listServices(db: Db) {
  const rows = await db.select().from(services).orderBy(asc(services.order));
  return attachSubServices(db, rows);
}

export async function getService(db: Db, id: string) {
  const [row] = await db.select().from(services).where(eq(services.id, id));
  if (!row) throw new NotFoundError("Service introuvable");
  const [withSubs] = await attachSubServices(db, [row]);
  return withSubs;
}

export async function createService(
  db: Db,
  data: {
    name: string;
    code: string;
    description?: string | null;
    icon?: string | null;
    order?: number;
    active?: boolean;
    requiresAppointment?: boolean;
  }
) {
  const [row] = await db
    .insert(services)
    .values({ id: newId("svc"), ...data })
    .returning();
  return { ...row, subServices: [] };
}

export async function updateService(db: Db, id: string, data: Partial<typeof services.$inferInsert>) {
  const [existing] = await db.select().from(services).where(eq(services.id, id));
  if (!existing) throw new NotFoundError("Service introuvable");

  const [updated] = await db.update(services).set(data).where(eq(services.id, id)).returning();
  const [withSubs] = await attachSubServices(db, [updated]);
  return withSubs;
}

export async function deleteService(db: Db, id: string) {
  const [existing] = await db.select().from(services).where(eq(services.id, id));
  if (!existing) throw new NotFoundError("Service introuvable");
  // Soft delete — sub-services et leurs schedules/requirements restent
  // intacts, juste masqués de l'usage actif.
  await db.update(services).set({ active: false }).where(eq(services.id, id));
}

/** Sous-service + service parent, sans horaires ni prérequis — pour les enrichissements de listes. */
export async function getSubServiceShallow(db: Db, id: string) {
  const [sub] = await db.select().from(subServices).where(eq(subServices.id, id));
  if (!sub) return null;
  const [service] = await db.select().from(services).where(eq(services.id, sub.serviceId));
  return { ...sub, basePrice: sub.basePrice != null ? Number(sub.basePrice) : null, service };
}

export async function getSubService(db: Db, id: string) {
  const [row] = await db.select().from(subServices).where(eq(subServices.id, id));
  if (!row) throw new NotFoundError("Sous-service introuvable");
  const [service] = await db.select().from(services).where(eq(services.id, row.serviceId));
  const [schedules, reqs] = await Promise.all([
    db.select().from(serviceSchedules).where(eq(serviceSchedules.subServiceId, id)),
    db.select().from(requirements).where(eq(requirements.subServiceId, id)).orderBy(asc(requirements.order)),
  ]);
  return { ...row, service, schedules, requirements: reqs };
}

export async function createSubService(
  db: Db,
  data: {
    serviceId: string;
    name: string;
    code: string;
    description?: string | null;
    active?: boolean;
    basePrice?: number | null;
    currency?: string;
    slaDays: number;
    allowCustomRequest?: boolean;
    requiresInPerson?: boolean;
  }
) {
  const [service] = await db.select().from(services).where(eq(services.id, data.serviceId));
  if (!service) throw new NotFoundError("Service parent introuvable");

  const [row] = await db
    .insert(subServices)
    .values({
      id: newId("sub"),
      ...data,
      basePrice: data.basePrice != null ? String(data.basePrice) : null,
    })
    .returning();
  return { ...row, service, schedules: [], requirements: [] };
}

export async function updateSubService(
  db: Db,
  id: string,
  data: Partial<{
    name: string;
    code: string;
    description: string | null;
    active: boolean;
    basePrice: number | null;
    currency: string;
    slaDays: number;
    allowCustomRequest: boolean;
    requiresInPerson: boolean;
  }>
) {
  const [existing] = await db.select().from(subServices).where(eq(subServices.id, id));
  if (!existing) throw new NotFoundError("Sous-service introuvable");

  const patch = { ...data } as Record<string, unknown>;
  if (patch.basePrice != null) patch.basePrice = String(patch.basePrice);

  await db.update(subServices).set(patch).where(eq(subServices.id, id));
  return getSubService(db, id);
}

export async function createSchedule(
  db: Db,
  subServiceId: string,
  data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes?: number;
    maxConcurrentSlots?: number;
    isActive?: boolean;
    validFrom?: string;
    validUntil?: string | null;
  }
) {
  const [sub] = await db.select().from(subServices).where(eq(subServices.id, subServiceId));
  if (!sub) throw new NotFoundError("Sous-service introuvable");

  const [row] = await db
    .insert(serviceSchedules)
    .values({
      id: newId("sch"),
      subServiceId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      slotDurationMinutes: data.slotDurationMinutes ?? 30,
      maxConcurrentSlots: data.maxConcurrentSlots ?? 1,
      isActive: data.isActive ?? true,
      validFrom: data.validFrom ?? new Date().toISOString().split("T")[0],
      validUntil: data.validUntil ?? null,
    })
    .returning();
  return row;
}

export async function updateSchedule(db: Db, id: string, data: Partial<typeof serviceSchedules.$inferInsert>) {
  const [existing] = await db.select().from(serviceSchedules).where(eq(serviceSchedules.id, id));
  if (!existing) throw new NotFoundError("Horaire introuvable");

  const [updated] = await db.update(serviceSchedules).set(data).where(eq(serviceSchedules.id, id)).returning();
  return updated;
}

export async function deleteSchedule(db: Db, id: string) {
  const [existing] = await db.select().from(serviceSchedules).where(eq(serviceSchedules.id, id));
  if (!existing) throw new NotFoundError("Horaire introuvable");
  await db.delete(serviceSchedules).where(eq(serviceSchedules.id, id));
}

export async function createException(
  db: Db,
  subServiceId: string,
  data: {
    date: string;
    type: string;
    startTime?: string | null;
    endTime?: string | null;
    reason: string;
  },
  createdBy: string
) {
  const [sub] = await db.select().from(subServices).where(eq(subServices.id, subServiceId));
  if (!sub) throw new NotFoundError("Sous-service introuvable");

  const [row] = await db
    .insert(serviceExceptions)
    .values({
      id: newId("exc"),
      subServiceId,
      date: data.date,
      type: data.type,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      reason: data.reason,
      createdBy,
    })
    .returning();
  return row;
}

export async function deleteException(db: Db, id: string) {
  const [existing] = await db.select().from(serviceExceptions).where(eq(serviceExceptions.id, id));
  if (!existing) throw new NotFoundError("Exception introuvable");
  await db.delete(serviceExceptions).where(eq(serviceExceptions.id, id));
}

export async function addRequirement(
  db: Db,
  subServiceId: string,
  data: {
    type: string;
    label: string;
    key: string;
    description?: string | null;
    required?: boolean;
    order?: number;
    schema?: Record<string, unknown> | null;
  }
) {
  const [sub] = await db.select().from(subServices).where(eq(subServices.id, subServiceId));
  if (!sub) throw new NotFoundError("Sous-service introuvable");

  const [row] = await db
    .insert(requirements)
    .values({
      id: newId("req"),
      subServiceId,
      type: data.type,
      label: data.label,
      key: data.key,
      description: data.description ?? null,
      required: data.required ?? true,
      order: data.order ?? 0,
      schema: data.schema ?? null,
    })
    .returning();
  return row;
}

export async function updateRequirement(db: Db, id: string, data: Partial<typeof requirements.$inferInsert>) {
  const [existing] = await db.select().from(requirements).where(eq(requirements.id, id));
  if (!existing) throw new NotFoundError("Prérequis introuvable");

  const [updated] = await db.update(requirements).set(data).where(eq(requirements.id, id)).returning();
  return updated;
}

export async function removeRequirement(db: Db, id: string) {
  const [existing] = await db.select().from(requirements).where(eq(requirements.id, id));
  if (!existing) throw new NotFoundError("Prérequis introuvable");
  await db.delete(requirements).where(eq(requirements.id, id));
}
