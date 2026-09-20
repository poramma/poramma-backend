"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAssignments = listAssignments;
exports.createAssignment = createAssignment;
exports.updateAssignment = updateAssignment;
exports.deleteAssignment = deleteAssignment;
exports.listAvailabilities = listAvailabilities;
exports.createAvailability = createAvailability;
exports.updateAvailability = updateAvailability;
exports.deleteAvailability = deleteAvailability;
exports.listExceptions = listExceptions;
exports.createException = createException;
exports.deleteException = deleteException;
const crypto_1 = __importDefault(require("crypto"));
const connection_1 = require("../../db/connection");
const schema_rendezvous_1 = require("../../db/schema.rendezvous");
const schema_ambassade_1 = require("../../db/schema.ambassade");
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && bStart < aEnd;
}
function todayISO() {
    return new Date().toISOString().slice(0, 10);
}
function withinValidity(date, validFrom, validUntil) {
    if (validFrom && date < validFrom)
        return false;
    if (validUntil && date > validUntil)
        return false;
    return true;
}
async function attachSubService(assignment) {
    const [sub] = await connection_1.db.select().from(schema_ambassade_1.subServices).where((0, drizzle_orm_1.eq)(schema_ambassade_1.subServices.id, assignment.subServiceId));
    const service = sub ? (await connection_1.db.select().from(schema_ambassade_1.services).where((0, drizzle_orm_1.eq)(schema_ambassade_1.services.id, sub.serviceId)))[0] : undefined;
    return { ...assignment, subService: sub ? { ...sub, basePrice: sub.basePrice != null ? Number(sub.basePrice) : null, service } : null };
}
async function listAssignments(agentId) {
    const rows = await connection_1.db.select().from(schema_rendezvous_1.agentServiceAssignments).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentServiceAssignments.agentId, agentId));
    return Promise.all(rows.map(attachSubService));
}
async function createAssignment(agentId, data, assignedBy) {
    const [sub] = await connection_1.db.select().from(schema_ambassade_1.subServices).where((0, drizzle_orm_1.eq)(schema_ambassade_1.subServices.id, data.subServiceId));
    if (!sub)
        throw new utils_1.NotFoundError("Sous-service introuvable");
    const [row] = await connection_1.db
        .insert(schema_rendezvous_1.agentServiceAssignments)
        .values({ id: newId("asg"), agentId, assignedBy, ...data })
        .returning();
    return attachSubService(row);
}
async function updateAssignment(assignmentId, data) {
    const [existing] = await connection_1.db.select().from(schema_rendezvous_1.agentServiceAssignments).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentServiceAssignments.id, assignmentId));
    if (!existing)
        throw new utils_1.NotFoundError("Affectation introuvable");
    const [updated] = await connection_1.db
        .update(schema_rendezvous_1.agentServiceAssignments)
        .set(data)
        .where((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentServiceAssignments.id, assignmentId))
        .returning();
    return attachSubService(updated);
}
async function deleteAssignment(assignmentId) {
    const [existing] = await connection_1.db.select().from(schema_rendezvous_1.agentServiceAssignments).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentServiceAssignments.id, assignmentId));
    if (!existing)
        throw new utils_1.NotFoundError("Affectation introuvable");
    await connection_1.db.delete(schema_rendezvous_1.agentServiceAssignments).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentServiceAssignments.id, assignmentId));
}
async function listAvailabilities(agentId, date) {
    const rows = await connection_1.db.select().from(schema_rendezvous_1.agentAvailabilities).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentAvailabilities.agentId, agentId));
    if (!date)
        return rows;
    return rows.filter((r) => withinValidity(date, r.validFrom, r.validUntil));
}
async function checkAvailabilityOverlap(agentId, dayOfWeek, startTime, endTime, excludeId) {
    const rows = await connection_1.db.select().from(schema_rendezvous_1.agentAvailabilities).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentAvailabilities.agentId, agentId), (0, drizzle_orm_1.eq)(schema_rendezvous_1.agentAvailabilities.dayOfWeek, dayOfWeek)));
    const newStart = timeToMinutes(startTime);
    const newEnd = timeToMinutes(endTime);
    let warning;
    for (const slot of rows) {
        if (excludeId && slot.id === excludeId)
            continue;
        if (!slot.startTime || !slot.endTime)
            continue;
        const exStart = timeToMinutes(slot.startTime);
        const exEnd = timeToMinutes(slot.endTime);
        if (exStart === newStart && exEnd === newEnd) {
            throw new utils_1.ValidationError("Ce créneau de disponibilité existe déjà pour ce jour", { startTime: ["duplicate"] });
        }
        if (rangesOverlap(newStart, newEnd, exStart, exEnd)) {
            warning = "Ce créneau chevauche une disponibilité déjà enregistrée pour ce jour — la plus récente est prioritaire.";
        }
    }
    return warning;
}
async function createAvailability(agentId, data) {
    const warning = data.startTime && data.endTime ? await checkAvailabilityOverlap(agentId, data.dayOfWeek, data.startTime, data.endTime) : undefined;
    const [row] = await connection_1.db
        .insert(schema_rendezvous_1.agentAvailabilities)
        .values({ id: newId("avl"), agentId, ...data })
        .returning();
    return warning ? { ...row, warning } : row;
}
async function updateAvailability(availabilityId, data) {
    const [existing] = await connection_1.db.select().from(schema_rendezvous_1.agentAvailabilities).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentAvailabilities.id, availabilityId));
    if (!existing)
        throw new utils_1.NotFoundError("Disponibilité introuvable");
    const dayOfWeek = data.dayOfWeek ?? existing.dayOfWeek;
    const startTime = data.startTime !== undefined ? data.startTime : existing.startTime;
    const endTime = data.endTime !== undefined ? data.endTime : existing.endTime;
    const warning = startTime && endTime ? await checkAvailabilityOverlap(existing.agentId, dayOfWeek, startTime, endTime, availabilityId) : undefined;
    const [updated] = await connection_1.db
        .update(schema_rendezvous_1.agentAvailabilities)
        .set(data)
        .where((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentAvailabilities.id, availabilityId))
        .returning();
    return warning ? { ...updated, warning } : updated;
}
async function deleteAvailability(availabilityId) {
    const [existing] = await connection_1.db.select().from(schema_rendezvous_1.agentAvailabilities).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentAvailabilities.id, availabilityId));
    if (!existing)
        throw new utils_1.NotFoundError("Disponibilité introuvable");
    await connection_1.db.delete(schema_rendezvous_1.agentAvailabilities).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentAvailabilities.id, availabilityId));
}
async function listExceptions(agentId, date, from) {
    const conditions = [(0, drizzle_orm_1.eq)(schema_rendezvous_1.agentExceptions.agentId, agentId)];
    if (date)
        conditions.push((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentExceptions.date, date));
    if (from)
        conditions.push((0, drizzle_orm_1.gte)(schema_rendezvous_1.agentExceptions.date, from));
    return connection_1.db.select().from(schema_rendezvous_1.agentExceptions).where((0, drizzle_orm_1.and)(...conditions)).orderBy(schema_rendezvous_1.agentExceptions.date);
}
async function createException(agentId, data, createdBy) {
    if (data.date < todayISO()) {
        throw new utils_1.ValidationError("La date de l'exception doit être aujourd'hui ou une date future", { date: ["must be present or future"] });
    }
    const isFullDay = data.isFullDay ?? true;
    const existing = await connection_1.db.select().from(schema_rendezvous_1.agentExceptions).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentExceptions.agentId, agentId), (0, drizzle_orm_1.eq)(schema_rendezvous_1.agentExceptions.date, data.date)));
    let warning;
    for (const exc of existing) {
        const excIsFullDay = Boolean(exc.isFullDay);
        const sameShape = exc.type === data.type &&
            excIsFullDay === isFullDay &&
            (isFullDay || (exc.startTime === (data.startTime ?? null) && exc.endTime === (data.endTime ?? null)));
        if (sameShape) {
            throw new utils_1.ValidationError("Cette exception existe déjà pour cette date", { date: ["duplicate"] });
        }
        const overlaps = isFullDay ||
            excIsFullDay ||
            (!!data.startTime && !!data.endTime && !!exc.startTime && !!exc.endTime &&
                rangesOverlap(timeToMinutes(data.startTime), timeToMinutes(data.endTime), timeToMinutes(exc.startTime), timeToMinutes(exc.endTime)));
        if (overlaps) {
            warning = "Cette exception chevauche une autre exception déjà enregistrée pour cette date — la plus récente est prioritaire.";
        }
    }
    const [row] = await connection_1.db
        .insert(schema_rendezvous_1.agentExceptions)
        .values({ id: newId("exc"), agentId, createdBy, ...data })
        .returning();
    return warning ? { ...row, warning } : row;
}
async function deleteException(exceptionId) {
    const [existing] = await connection_1.db.select().from(schema_rendezvous_1.agentExceptions).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentExceptions.id, exceptionId));
    if (!existing)
        throw new utils_1.NotFoundError("Exception introuvable");
    await connection_1.db.delete(schema_rendezvous_1.agentExceptions).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentExceptions.id, exceptionId));
}
//# sourceMappingURL=agent-schedule.service.js.map