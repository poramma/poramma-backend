"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listServices = listServices;
exports.getService = getService;
exports.createService = createService;
exports.updateService = updateService;
exports.deleteService = deleteService;
exports.getSubServiceShallow = getSubServiceShallow;
exports.getSubService = getSubService;
exports.createSubService = createSubService;
exports.updateSubService = updateSubService;
exports.createSchedule = createSchedule;
exports.updateSchedule = updateSchedule;
exports.deleteSchedule = deleteSchedule;
exports.createException = createException;
exports.deleteException = deleteException;
exports.addRequirement = addRequirement;
exports.updateRequirement = updateRequirement;
exports.removeRequirement = removeRequirement;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const services_1 = require("../schema/services");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
async function attachSubServices(db, serviceRows) {
    if (serviceRows.length === 0)
        return serviceRows.map((s) => ({ ...s, subServices: [] }));
    const serviceIds = serviceRows.map((s) => s.id);
    const subRows = await db
        .select()
        .from(services_1.subServices)
        .where((0, drizzle_orm_1.inArray)(services_1.subServices.serviceId, serviceIds))
        .orderBy((0, drizzle_orm_1.asc)(services_1.subServices.name));
    const subIds = subRows.map((s) => s.id);
    const [scheduleRows, requirementRows] = subIds.length
        ? await Promise.all([
            db.select().from(services_1.serviceSchedules).where((0, drizzle_orm_1.inArray)(services_1.serviceSchedules.subServiceId, subIds)),
            db.select().from(services_1.requirements).where((0, drizzle_orm_1.inArray)(services_1.requirements.subServiceId, subIds)).orderBy((0, drizzle_orm_1.asc)(services_1.requirements.order)),
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
async function listServices(db) {
    const rows = await db.select().from(services_1.services).orderBy((0, drizzle_orm_1.asc)(services_1.services.order));
    return attachSubServices(db, rows);
}
async function getService(db, id) {
    const [row] = await db.select().from(services_1.services).where((0, drizzle_orm_1.eq)(services_1.services.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Service introuvable");
    const [withSubs] = await attachSubServices(db, [row]);
    return withSubs;
}
async function createService(db, data) {
    const [row] = await db
        .insert(services_1.services)
        .values({ id: newId("svc"), ...data })
        .returning();
    return { ...row, subServices: [] };
}
async function updateService(db, id, data) {
    const [existing] = await db.select().from(services_1.services).where((0, drizzle_orm_1.eq)(services_1.services.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Service introuvable");
    const [updated] = await db.update(services_1.services).set(data).where((0, drizzle_orm_1.eq)(services_1.services.id, id)).returning();
    const [withSubs] = await attachSubServices(db, [updated]);
    return withSubs;
}
async function deleteService(db, id) {
    const [existing] = await db.select().from(services_1.services).where((0, drizzle_orm_1.eq)(services_1.services.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Service introuvable");
    await db.update(services_1.services).set({ active: false }).where((0, drizzle_orm_1.eq)(services_1.services.id, id));
}
async function getSubServiceShallow(db, id) {
    const [sub] = await db.select().from(services_1.subServices).where((0, drizzle_orm_1.eq)(services_1.subServices.id, id));
    if (!sub)
        return null;
    const [service] = await db.select().from(services_1.services).where((0, drizzle_orm_1.eq)(services_1.services.id, sub.serviceId));
    return { ...sub, basePrice: sub.basePrice != null ? Number(sub.basePrice) : null, service };
}
async function getSubService(db, id) {
    const [row] = await db.select().from(services_1.subServices).where((0, drizzle_orm_1.eq)(services_1.subServices.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Sous-service introuvable");
    const [service] = await db.select().from(services_1.services).where((0, drizzle_orm_1.eq)(services_1.services.id, row.serviceId));
    const [schedules, reqs] = await Promise.all([
        db.select().from(services_1.serviceSchedules).where((0, drizzle_orm_1.eq)(services_1.serviceSchedules.subServiceId, id)),
        db.select().from(services_1.requirements).where((0, drizzle_orm_1.eq)(services_1.requirements.subServiceId, id)).orderBy((0, drizzle_orm_1.asc)(services_1.requirements.order)),
    ]);
    return { ...row, service, schedules, requirements: reqs };
}
async function createSubService(db, data) {
    const [service] = await db.select().from(services_1.services).where((0, drizzle_orm_1.eq)(services_1.services.id, data.serviceId));
    if (!service)
        throw new utils_1.NotFoundError("Service parent introuvable");
    const [row] = await db
        .insert(services_1.subServices)
        .values({
        id: newId("sub"),
        ...data,
        basePrice: data.basePrice != null ? String(data.basePrice) : null,
    })
        .returning();
    return { ...row, service, schedules: [], requirements: [] };
}
async function updateSubService(db, id, data) {
    const [existing] = await db.select().from(services_1.subServices).where((0, drizzle_orm_1.eq)(services_1.subServices.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Sous-service introuvable");
    const patch = { ...data };
    if (patch.basePrice != null)
        patch.basePrice = String(patch.basePrice);
    await db.update(services_1.subServices).set(patch).where((0, drizzle_orm_1.eq)(services_1.subServices.id, id));
    return getSubService(db, id);
}
async function createSchedule(db, subServiceId, data) {
    const [sub] = await db.select().from(services_1.subServices).where((0, drizzle_orm_1.eq)(services_1.subServices.id, subServiceId));
    if (!sub)
        throw new utils_1.NotFoundError("Sous-service introuvable");
    const [row] = await db
        .insert(services_1.serviceSchedules)
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
async function updateSchedule(db, id, data) {
    const [existing] = await db.select().from(services_1.serviceSchedules).where((0, drizzle_orm_1.eq)(services_1.serviceSchedules.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Horaire introuvable");
    const [updated] = await db.update(services_1.serviceSchedules).set(data).where((0, drizzle_orm_1.eq)(services_1.serviceSchedules.id, id)).returning();
    return updated;
}
async function deleteSchedule(db, id) {
    const [existing] = await db.select().from(services_1.serviceSchedules).where((0, drizzle_orm_1.eq)(services_1.serviceSchedules.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Horaire introuvable");
    await db.delete(services_1.serviceSchedules).where((0, drizzle_orm_1.eq)(services_1.serviceSchedules.id, id));
}
async function createException(db, subServiceId, data, createdBy) {
    const [sub] = await db.select().from(services_1.subServices).where((0, drizzle_orm_1.eq)(services_1.subServices.id, subServiceId));
    if (!sub)
        throw new utils_1.NotFoundError("Sous-service introuvable");
    const [row] = await db
        .insert(services_1.serviceExceptions)
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
async function deleteException(db, id) {
    const [existing] = await db.select().from(services_1.serviceExceptions).where((0, drizzle_orm_1.eq)(services_1.serviceExceptions.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Exception introuvable");
    await db.delete(services_1.serviceExceptions).where((0, drizzle_orm_1.eq)(services_1.serviceExceptions.id, id));
}
async function addRequirement(db, subServiceId, data) {
    const [sub] = await db.select().from(services_1.subServices).where((0, drizzle_orm_1.eq)(services_1.subServices.id, subServiceId));
    if (!sub)
        throw new utils_1.NotFoundError("Sous-service introuvable");
    const [row] = await db
        .insert(services_1.requirements)
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
async function updateRequirement(db, id, data) {
    const [existing] = await db.select().from(services_1.requirements).where((0, drizzle_orm_1.eq)(services_1.requirements.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Prérequis introuvable");
    const [updated] = await db.update(services_1.requirements).set(data).where((0, drizzle_orm_1.eq)(services_1.requirements.id, id)).returning();
    return updated;
}
async function removeRequirement(db, id) {
    const [existing] = await db.select().from(services_1.requirements).where((0, drizzle_orm_1.eq)(services_1.requirements.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Prérequis introuvable");
    await db.delete(services_1.requirements).where((0, drizzle_orm_1.eq)(services_1.requirements.id, id));
}
//# sourceMappingURL=services.js.map