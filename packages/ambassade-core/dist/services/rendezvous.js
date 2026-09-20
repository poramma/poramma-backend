"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSlotConflict = exports.MODIFIABLE_STATUSES = exports.RELEASED_STATUSES = exports.BOOKING_HORIZON_DAYS = exports.TZ = void 0;
exports.isoDayOfWeek = isoDayOfWeek;
exports.timeToMinutes = timeToMinutes;
exports.minutesToTime = minutesToTime;
exports.addDays = addDays;
exports.nowInEmbassyTz = nowInEmbassyTz;
exports.slotId = slotId;
exports.computeSlots = computeSlots;
exports.listPublicSlots = listPublicSlots;
exports.listAvailableDates = listAvailableDates;
exports.nextTicketId = nextTicketId;
exports.bookForUser = bookForUser;
exports.listByUser = listByUser;
exports.getOwned = getOwned;
exports.listNotesForUser = listNotesForUser;
exports.addNoteByUser = addNoteByUser;
exports.cancelByUser = cancelByUser;
exports.rescheduleByUser = rescheduleByUser;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const services_1 = require("../schema/services");
const demandes_1 = require("../schema/demandes");
const rendezvous_1 = require("../schema/rendezvous");
const identity_1 = require("../schema/identity");
const audit_1 = require("./audit");
const notifications_1 = require("./notifications");
const culture_1 = require("./culture");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
exports.TZ = "Africa/Casablanca";
exports.BOOKING_HORIZON_DAYS = 60;
exports.RELEASED_STATUSES = ["CANCELLED_BY_USER", "CANCELLED_BY_AGENT", "NO_SHOW"];
exports.MODIFIABLE_STATUSES = ["PENDING", "CONFIRMED"];
function isoDayOfWeek(date) {
    const d = new Date(`${date}T00:00:00Z`).getUTCDay();
    return d === 0 ? 7 : d;
}
function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}
function minutesToTime(m) {
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
const hhmm = (t) => t.slice(0, 5);
function addDays(date, days) {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}
function nowInEmbassyTz(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: exports.TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(now);
    const get = (t) => parts.find((p) => p.type === t).value;
    const hour = Number(get("hour")) % 24;
    return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: hour * 60 + Number(get("minute")) };
}
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function assertBookableDate(date) {
    if (!DATE_RE.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
        throw new utils_1.ValidationError("Date invalide", { date: ["Format attendu : AAAA-MM-JJ"] });
    }
    const today = nowInEmbassyTz().date;
    if (date < today)
        throw new utils_1.ValidationError("Cette date est passée", { date: ["Choisissez une date à venir"] });
    if (date > addDays(today, exports.BOOKING_HORIZON_DAYS)) {
        throw new utils_1.ValidationError(`Les rendez-vous ne peuvent être pris que dans les ${exports.BOOKING_HORIZON_DAYS} prochains jours`, {
            date: ["Date trop éloignée"],
        });
    }
}
function isPast(date, startMinutes, now = nowInEmbassyTz()) {
    return date < now.date || (date === now.date && startMinutes <= now.minutes);
}
function withinValidity(date, validFrom, validUntil) {
    if (validFrom && date < validFrom)
        return false;
    if (validUntil && date > validUntil)
        return false;
    return true;
}
function isUniqueViolation(err) {
    const e = err;
    return e?.code === "23505" || e?.cause?.code === "23505";
}
function slotId(subServiceId, agentId, date, startTime) {
    return `slot|${subServiceId}|${agentId}|${date}|${startTime}`;
}
async function loadContext(db, subServiceId, from, to) {
    const [schedules, exceptions, assignments] = await Promise.all([
        db.select().from(services_1.serviceSchedules).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(services_1.serviceSchedules.subServiceId, subServiceId), (0, drizzle_orm_1.eq)(services_1.serviceSchedules.isActive, true))),
        db
            .select()
            .from(services_1.serviceExceptions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(services_1.serviceExceptions.subServiceId, subServiceId), (0, drizzle_orm_1.gte)(services_1.serviceExceptions.date, from), (0, drizzle_orm_1.lte)(services_1.serviceExceptions.date, to))),
        db
            .select()
            .from(rendezvous_1.agentServiceAssignments)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(rendezvous_1.agentServiceAssignments.subServiceId, subServiceId), (0, drizzle_orm_1.eq)(rendezvous_1.agentServiceAssignments.active, true))),
    ]);
    const agentIds = [...new Set(assignments.map((a) => a.agentId))];
    const [availabilities, agentExc, bookings] = await Promise.all([
        agentIds.length
            ? db
                .select()
                .from(rendezvous_1.agentAvailabilities)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(rendezvous_1.agentAvailabilities.agentId, agentIds), (0, drizzle_orm_1.eq)(rendezvous_1.agentAvailabilities.isAvailable, true)))
            : Promise.resolve([]),
        agentIds.length
            ? db
                .select()
                .from(rendezvous_1.agentExceptions)
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(rendezvous_1.agentExceptions.agentId, agentIds), (0, drizzle_orm_1.gte)(rendezvous_1.agentExceptions.date, from), (0, drizzle_orm_1.lte)(rendezvous_1.agentExceptions.date, to)))
            : Promise.resolve([]),
        db
            .select({ slotId: rendezvous_1.rendezVous.slotId, agentId: rendezvous_1.rendezVous.agentId, date: rendezvous_1.rendezVous.date })
            .from(rendezvous_1.rendezVous)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(rendezvous_1.rendezVous.subServiceId, subServiceId), (0, drizzle_orm_1.gte)(rendezvous_1.rendezVous.date, from), (0, drizzle_orm_1.lte)(rendezvous_1.rendezVous.date, to), (0, drizzle_orm_1.sql) `${rendezvous_1.rendezVous.status} not in ('CANCELLED_BY_USER','CANCELLED_BY_AGENT','NO_SHOW')`)),
    ]);
    return { subServiceId, schedules, exceptions, assignments, availabilities, agentExc, bookings };
}
function slotsForDate(ctx, date) {
    const dayOfWeek = isoDayOfWeek(date);
    const schedules = ctx.schedules.filter((s) => s.dayOfWeek === dayOfWeek && withinValidity(date, s.validFrom, s.validUntil));
    if (!schedules.length)
        return [];
    const dayExceptions = ctx.exceptions.filter((e) => e.date === date);
    if (dayExceptions.some((e) => e.type === "CLOSED"))
        return [];
    const special = dayExceptions.find((e) => e.type === "SPECIAL_HOURS" && e.startTime && e.endTime);
    const assignments = ctx.assignments.filter((a) => withinValidity(date, a.validFrom, a.validUntil));
    if (!assignments.length)
        return [];
    const out = [];
    for (const schedule of schedules) {
        const windowStart = timeToMinutes(special ? special.startTime : schedule.startTime);
        const windowEnd = timeToMinutes(special ? special.endTime : schedule.endTime);
        const duration = schedule.slotDurationMinutes;
        if (duration <= 0)
            continue;
        for (const assignment of assignments) {
            const availability = ctx.availabilities.find((a) => a.agentId === assignment.agentId && a.dayOfWeek === dayOfWeek && a.startTime && a.endTime && withinValidity(date, a.validFrom, a.validUntil));
            if (!availability)
                continue;
            const start = Math.max(windowStart, timeToMinutes(availability.startTime));
            const end = Math.min(windowEnd, timeToMinutes(availability.endTime));
            if (start >= end)
                continue;
            const exc = ctx.agentExc.filter((e) => e.agentId === assignment.agentId && e.date === date);
            if (exc.some((e) => e.isFullDay))
                continue;
            const partial = exc
                .filter((e) => !e.isFullDay && e.startTime && e.endTime)
                .map((e) => [timeToMinutes(e.startTime), timeToMinutes(e.endTime)]);
            for (let t = start; t + duration <= end; t += duration) {
                if (partial.some(([exStart, exEnd]) => t < exEnd && t + duration > exStart))
                    continue;
                const startTime = minutesToTime(t);
                out.push({
                    id: slotId(ctx.subServiceId, assignment.agentId, date, startTime),
                    subServiceId: ctx.subServiceId,
                    agentId: assignment.agentId,
                    date,
                    startTime,
                    endTime: minutesToTime(t + duration),
                    maxConcurrent: schedule.maxConcurrentSlots,
                    maxDailyForAgent: assignment.maxDailyAppointments ?? null,
                });
            }
        }
    }
    return out;
}
async function computeSlots(db, subServiceId, date, filterAgentId) {
    const ctx = await loadContext(db, subServiceId, date, date);
    const slots = slotsForDate(ctx, date);
    return filterAgentId ? slots.filter((s) => s.agentId === filterAgentId) : slots;
}
function publicSlotsForDate(ctx, date, now = nowInEmbassyTz()) {
    const raw = slotsForDate(ctx, date);
    const bookedIds = new Set(ctx.bookings.filter((b) => b.date === date && b.slotId).map((b) => b.slotId));
    const dailyCount = (agentId) => ctx.bookings.filter((b) => b.date === date && b.agentId === agentId).length;
    const byTime = new Map();
    for (const s of raw) {
        if (isPast(date, timeToMinutes(s.startTime), now))
            continue;
        (byTime.get(s.startTime) ?? byTime.set(s.startTime, []).get(s.startTime)).push(s);
    }
    const slots = [];
    const free = new Map();
    for (const [startTime, group] of [...byTime.entries()].sort(([a], [b]) => a.localeCompare(b))) {
        const bookedInGroup = group.filter((s) => bookedIds.has(s.id)).length;
        const maxConcurrent = Math.min(...group.map((s) => s.maxConcurrent));
        const candidates = group.filter((s) => !bookedIds.has(s.id) && (s.maxDailyForAgent == null || dailyCount(s.agentId) < s.maxDailyForAgent));
        const available = candidates.length > 0 && bookedInGroup < maxConcurrent;
        slots.push({ date, startTime, endTime: group[0].endTime, isAvailable: available });
        if (available)
            free.set(startTime, candidates);
    }
    return { slots, free };
}
async function assertBookableSubService(db, subServiceId) {
    const [sub] = await db.select({ id: services_1.subServices.id, active: services_1.subServices.active }).from(services_1.subServices).where((0, drizzle_orm_1.eq)(services_1.subServices.id, subServiceId));
    if (!sub || !sub.active)
        throw new utils_1.NotFoundError("Service introuvable");
}
async function listPublicSlots(db, params) {
    assertBookableDate(params.date);
    await assertBookableSubService(db, params.subServiceId);
    const ctx = await loadContext(db, params.subServiceId, params.date, params.date);
    return publicSlotsForDate(ctx, params.date).slots;
}
async function listAvailableDates(db, params) {
    await assertBookableSubService(db, params.subServiceId);
    const days = Math.min(Math.max(params.days ?? 30, 1), exports.BOOKING_HORIZON_DAYS);
    const now = nowInEmbassyTz();
    const to = addDays(now.date, days);
    const ctx = await loadContext(db, params.subServiceId, now.date, to);
    const dates = [];
    for (let d = now.date; d <= to; d = addDays(d, 1)) {
        if (publicSlotsForDate(ctx, d, now).slots.some((s) => s.isAvailable))
            dates.push(d);
    }
    return dates;
}
async function nextTicketId(db, date, prefix) {
    const compact = date.replace(/-/g, "");
    const [{ count }] = await db
        .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
        .from(rendezvous_1.rendezVous)
        .where((0, drizzle_orm_1.like)(rendezvous_1.rendezVous.ticketId, `${prefix}-${compact}-%`));
    return `${prefix}-${compact}-${String(count + 1).padStart(3, "0")}`;
}
function pickAgent(candidates, ctx, date) {
    const load = (agentId) => ctx.bookings.filter((b) => b.date === date && b.agentId === agentId).length;
    return [...candidates].sort((a, b) => load(a.agentId) - load(b.agentId) || a.agentId.localeCompare(b.agentId))[0];
}
const SLOT_TAKEN = () => new utils_1.ValidationError("Ce créneau n'est plus disponible. Veuillez en choisir un autre.", { startTime: ["already booked"] });
async function bookForUser(db, params) {
    if (!TIME_RE.test(params.startTime))
        throw new utils_1.ValidationError("Heure invalide", { startTime: ["Format attendu : HH:MM"] });
    assertBookableDate(params.date);
    await assertBookableSubService(db, params.subServiceId);
    if (!params.motif || params.motif.trim().length < 3) {
        throw new utils_1.ValidationError("Précisez le motif de votre rendez-vous.", { motif: ["Le motif est obligatoire (3 caractères minimum)"] });
    }
    if (params.demandeId) {
        const [demande] = await db.select({ userId: demandes_1.demandes.userId }).from(demandes_1.demandes).where((0, drizzle_orm_1.eq)(demandes_1.demandes.id, params.demandeId));
        if (!demande || demande.userId !== params.userId)
            throw new utils_1.NotFoundError("Demande introuvable");
    }
    const [alreadyActive] = await db
        .select({ id: rendezvous_1.rendezVous.id })
        .from(rendezvous_1.rendezVous)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(rendezvous_1.rendezVous.userId, params.userId), (0, drizzle_orm_1.eq)(rendezvous_1.rendezVous.subServiceId, params.subServiceId), (0, drizzle_orm_1.inArray)(rendezvous_1.rendezVous.status, exports.MODIFIABLE_STATUSES), (0, drizzle_orm_1.gte)(rendezvous_1.rendezVous.date, nowInEmbassyTz().date)));
    if (alreadyActive) {
        throw new utils_1.ValidationError("Vous avez déjà un rendez-vous en cours pour ce service. Déplacez-le ou annulez-le pour en prendre un nouveau.", {
            subServiceId: ["active appointment exists"],
        });
    }
    for (let attempt = 0; attempt < 4; attempt++) {
        const ctx = await loadContext(db, params.subServiceId, params.date, params.date);
        const { free } = publicSlotsForDate(ctx, params.date);
        const candidates = free.get(params.startTime);
        if (!candidates?.length)
            throw SLOT_TAKEN();
        const chosen = pickAgent(candidates, ctx, params.date);
        try {
            const created = await db.transaction(async (tx) => {
                const ticketId = await nextTicketId(tx, params.date, "RDV");
                const [row] = await tx
                    .insert(rendezvous_1.rendezVous)
                    .values({
                    id: newId("rdv"),
                    demandeId: params.demandeId ?? null,
                    userId: params.userId,
                    subServiceId: params.subServiceId,
                    agentId: chosen.agentId,
                    slotId: chosen.id,
                    date: params.date,
                    ticketId,
                    type: "STANDARD",
                    status: "PENDING",
                    motif: params.motif ?? null,
                    createdBy: params.userId,
                })
                    .returning();
                await (0, audit_1.writeAudit)(db, {
                    action: "CREATE",
                    entityType: "RENDEZ_VOUS",
                    entityId: row.id,
                    actor: { userId: params.userId, roleName: null },
                    entitySnapshot: { type: "STANDARD", subServiceId: params.subServiceId, date: params.date, startTime: params.startTime },
                    details: { ticketId, selfService: true },
                    ip: params.ip,
                    tx,
                });
                return row;
            });
            try {
                const [sub] = await db.select({ name: services_1.subServices.name }).from(services_1.subServices).where((0, drizzle_orm_1.eq)(services_1.subServices.id, params.subServiceId));
                await (0, notifications_1.notifyRendezVous)(db, {
                    userId: params.userId,
                    rendezVousId: created.id,
                    event: "BOOKED",
                    ticketId: created.ticketId,
                    serviceName: sub?.name,
                    date: created.date,
                    startTime: params.startTime,
                });
            }
            catch (err) {
                console.error("[rendezvous] notification de réservation échouée", err);
            }
            await (0, culture_1.notifyAdvisorRendezVous)(db, { agentId: created.agentId, event: "BOOKED", userId: params.userId, ticketId: created.ticketId, date: created.date, startTime: params.startTime });
            return created;
        }
        catch (err) {
            if (isUniqueViolation(err))
                continue;
            throw err;
        }
    }
    throw SLOT_TAKEN();
}
async function describe(db, rows) {
    if (!rows.length)
        return [];
    const subIds = [...new Set(rows.map((r) => r.subServiceId))];
    const [subs, schedules] = await Promise.all([
        db
            .select({ id: services_1.subServices.id, name: services_1.subServices.name, serviceName: services_1.services.name, isCultural: services_1.services.isCultural })
            .from(services_1.subServices)
            .leftJoin(services_1.services, (0, drizzle_orm_1.eq)(services_1.subServices.serviceId, services_1.services.id))
            .where((0, drizzle_orm_1.inArray)(services_1.subServices.id, subIds)),
        db.select().from(services_1.serviceSchedules).where((0, drizzle_orm_1.inArray)(services_1.serviceSchedules.subServiceId, subIds)),
    ]);
    const now = nowInEmbassyTz();
    const advisors = subs.some((s) => s.isCultural) ? await (0, culture_1.listAdvisors)(db) : [];
    return rows.map((row) => {
        const startTime = row.slotId?.split("|")[4] ?? "00:00";
        const schedule = schedules.find((s) => s.subServiceId === row.subServiceId && s.dayOfWeek === isoDayOfWeek(row.date));
        const endTime = minutesToTime(timeToMinutes(startTime) + (schedule?.slotDurationMinutes ?? 30));
        const sub = subs.find((s) => s.id === row.subServiceId);
        const advisor = sub?.isCultural ? advisors.find((a) => a.agentId === row.agentId) : undefined;
        return {
            row,
            startTime,
            endTime,
            subService: sub ? { id: sub.id, name: sub.name, serviceName: sub.serviceName ?? null, isCultural: !!sub.isCultural } : null,
            advisor: advisor ? { name: advisor.name, title: advisor.title } : null,
            canModify: exports.MODIFIABLE_STATUSES.includes(row.status) && !!row.slotId && !isPast(row.date, timeToMinutes(startTime), now),
        };
    });
}
async function listByUser(db, userId) {
    const rows = await db.select().from(rendezvous_1.rendezVous).where((0, drizzle_orm_1.eq)(rendezvous_1.rendezVous.userId, userId)).orderBy(rendezvous_1.rendezVous.date, rendezvous_1.rendezVous.createdAt);
    return describe(db, rows);
}
async function getOwnedRow(db, userId, id) {
    const [row] = await db.select().from(rendezvous_1.rendezVous).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(rendezvous_1.rendezVous.id, id), (0, drizzle_orm_1.eq)(rendezvous_1.rendezVous.userId, userId)));
    if (!row)
        throw new utils_1.NotFoundError("Rendez-vous introuvable");
    return row;
}
async function getOwned(db, userId, id) {
    return (await describe(db, [await getOwnedRow(db, userId, id)]))[0];
}
async function listNotesForUser(db, userId, id) {
    await getOwnedRow(db, userId, id);
    const rows = await db.select().from(rendezvous_1.rendezVousNotes).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(rendezvous_1.rendezVousNotes.rendezVousId, id), (0, drizzle_orm_1.eq)(rendezvous_1.rendezVousNotes.isInternal, false))).orderBy(rendezvous_1.rendezVousNotes.createdAt);
    return rows;
}
async function addNoteByUser(db, params) {
    const row = await getOwnedRow(db, params.userId, params.id);
    if (exports.RELEASED_STATUSES.includes(row.status)) {
        throw new utils_1.ValidationError("Ce rendez-vous est annulé : l'échange est clos.", { status: ["closed"] });
    }
    const [profile] = await db
        .select({ firstName: identity_1.identityUserProfiles.firstName, lastName: identity_1.identityUserProfiles.lastName })
        .from(identity_1.identityUserProfiles)
        .where((0, drizzle_orm_1.eq)(identity_1.identityUserProfiles.userId, params.userId));
    const authorName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "Citoyen";
    const [note] = await db
        .insert(rendezvous_1.rendezVousNotes)
        .values({
        id: newId("note"),
        rendezVousId: params.id,
        authorId: params.userId,
        authorName,
        authorType: "STUDENT",
        content: params.content,
        isInternal: false,
    })
        .returning();
    await (0, audit_1.writeAudit)(db, {
        action: "NOTE",
        entityType: "RENDEZ_VOUS",
        entityId: params.id,
        actor: { userId: params.userId, roleName: null },
        details: { selfService: true },
        ip: params.ip,
    });
    return note;
}
function assertModifiable(item, verb) {
    if (!exports.MODIFIABLE_STATUSES.includes(item.row.status)) {
        throw new utils_1.ValidationError(`Ce rendez-vous ne peut plus être ${verb} (statut actuel : ${item.row.status}).`, { status: ["not modifiable"] });
    }
    if (!item.canModify)
        throw new utils_1.ValidationError(`Ce rendez-vous est passé : il ne peut plus être ${verb}.`, { date: ["in the past"] });
}
async function cancelByUser(db, params) {
    const item = await getOwned(db, params.userId, params.id);
    assertModifiable(item, "annulé");
    const [row] = await db.transaction(async (tx) => {
        const updated = await tx
            .update(rendezvous_1.rendezVous)
            .set({ status: "CANCELLED_BY_USER", updatedAt: new Date() })
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(rendezvous_1.rendezVous.id, params.id), (0, drizzle_orm_1.eq)(rendezvous_1.rendezVous.userId, params.userId), (0, drizzle_orm_1.inArray)(rendezvous_1.rendezVous.status, exports.MODIFIABLE_STATUSES)))
            .returning();
        if (!updated.length)
            throw new utils_1.ValidationError("Ce rendez-vous ne peut plus être annulé.", { status: ["changed"] });
        await (0, audit_1.writeAudit)(db, {
            action: "CANCEL",
            entityType: "RENDEZ_VOUS",
            entityId: params.id,
            actor: { userId: params.userId, roleName: null },
            entitySnapshot: { fromStatus: item.row.status, toStatus: "CANCELLED_BY_USER" },
            details: { reason: params.reason ?? null, selfService: true },
            ip: params.ip,
            tx,
        });
        return updated;
    });
    await (0, notifications_1.notifyRendezVous)(db, {
        userId: params.userId,
        rendezVousId: row.id,
        event: "CANCELLED_BY_USER",
        ticketId: row.ticketId,
        serviceName: item.subService?.name,
        date: row.date,
        startTime: item.startTime,
    });
    await (0, culture_1.notifyAdvisorRendezVous)(db, { agentId: row.agentId, event: "CANCELLED", userId: params.userId, ticketId: row.ticketId, date: row.date, startTime: item.startTime });
    return { ...item, row, canModify: false };
}
async function rescheduleByUser(db, params) {
    if (!TIME_RE.test(params.startTime))
        throw new utils_1.ValidationError("Heure invalide", { startTime: ["Format attendu : HH:MM"] });
    assertBookableDate(params.date);
    const item = await getOwned(db, params.userId, params.id);
    assertModifiable(item, "déplacé");
    if (item.row.slotId?.endsWith(`|${params.date}|${params.startTime}`)) {
        throw new utils_1.ValidationError("C'est déjà l'horaire de votre rendez-vous.", { startTime: ["unchanged"] });
    }
    for (let attempt = 0; attempt < 4; attempt++) {
        const ctx = await loadContext(db, item.row.subServiceId, params.date, params.date);
        const { free } = publicSlotsForDate(ctx, params.date);
        const candidates = free.get(params.startTime);
        if (!candidates?.length)
            throw SLOT_TAKEN();
        const chosen = pickAgent(candidates, ctx, params.date);
        try {
            const updated = await db.transaction(async (tx) => {
                const ticketId = await nextTicketId(tx, params.date, "RDV");
                const rows = await tx
                    .update(rendezvous_1.rendezVous)
                    .set({ slotId: chosen.id, agentId: chosen.agentId, date: params.date, ticketId, status: "PENDING", updatedAt: new Date() })
                    .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(rendezvous_1.rendezVous.id, params.id), (0, drizzle_orm_1.eq)(rendezvous_1.rendezVous.userId, params.userId), (0, drizzle_orm_1.inArray)(rendezvous_1.rendezVous.status, exports.MODIFIABLE_STATUSES)))
                    .returning();
                if (!rows.length)
                    throw new utils_1.ValidationError("Ce rendez-vous ne peut plus être déplacé.", { status: ["changed"] });
                await (0, audit_1.writeAudit)(db, {
                    action: "RESCHEDULE",
                    entityType: "RENDEZ_VOUS",
                    entityId: params.id,
                    actor: { userId: params.userId, roleName: null },
                    entitySnapshot: { from: { date: item.row.date, startTime: item.startTime }, to: { date: params.date, startTime: params.startTime } },
                    details: { previousTicketId: item.row.ticketId, ticketId, selfService: true },
                    ip: params.ip,
                    tx,
                });
                return rows[0];
            });
            await (0, notifications_1.notifyRendezVous)(db, {
                userId: params.userId,
                rendezVousId: updated.id,
                event: "RESCHEDULED",
                ticketId: updated.ticketId,
                serviceName: item.subService?.name,
                date: updated.date,
                startTime: params.startTime,
            });
            await (0, culture_1.notifyAdvisorRendezVous)(db, { agentId: updated.agentId, event: "RESCHEDULED", userId: params.userId, ticketId: updated.ticketId, date: updated.date, startTime: params.startTime });
            return getOwned(db, params.userId, params.id);
        }
        catch (err) {
            if (isUniqueViolation(err))
                continue;
            throw err;
        }
    }
    throw SLOT_TAKEN();
}
exports.isSlotConflict = isUniqueViolation;
//# sourceMappingURL=rendezvous.js.map