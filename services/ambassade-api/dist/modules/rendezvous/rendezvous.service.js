"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAgendaSlots = listAgendaSlots;
exports.getAgendaSlot = getAgendaSlot;
exports.listRendezVous = listRendezVous;
exports.getRendezVous = getRendezVous;
exports.createRendezVous = createRendezVous;
exports.createUrgence = createUrgence;
exports.updateStatus = updateStatus;
exports.checkIn = checkIn;
exports.completeRendezVous = completeRendezVous;
exports.cancelRendezVous = cancelRendezVous;
exports.printDaily = printDaily;
exports.printHistory = printHistory;
exports.reprint = reprint;
exports.getRendezVousOwnerId = getRendezVousOwnerId;
exports.getRendezVousAccessInfo = getRendezVousAccessInfo;
exports.listNotes = listNotes;
exports.addNote = addNote;
const crypto_1 = __importDefault(require("crypto"));
const connection_1 = require("../../db/connection");
const schema_rendezvous_1 = require("../../db/schema.rendezvous");
const schema_ambassade_1 = require("../../db/schema.ambassade");
const schema_demandes_1 = require("../../db/schema.demandes");
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const enrich_1 = require("../../shared/enrich");
const audit_service_1 = require("../audit/audit.service");
const ambassade_core_1 = require("@poramma/ambassade-core");
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
const CANCELLED_STATUSES = ["CANCELLED_BY_USER", "CANCELLED_BY_AGENT", "NO_SHOW"];
function isoDayOfWeek(date) {
    const d = new Date(`${date}T00:00:00Z`).getUTCDay();
    return d === 0 ? 7 : d;
}
function timeToMinutes(t) {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
}
function minutesToTime(m) {
    const h = Math.floor(m / 60)
        .toString()
        .padStart(2, "0");
    const mm = (m % 60).toString().padStart(2, "0");
    return `${h}:${mm}`;
}
async function generateSlotsForSubService(subServiceId, date, filterAgentId) {
    const raw = await ambassade_core_1.rendezvousLogic.computeSlots(connection_1.db, subServiceId, date, filterAgentId);
    if (!raw.length)
        return [];
    const subService = await (0, enrich_1.getSubServiceShallow)(subServiceId);
    const agents = new Map();
    for (const agentId of new Set(raw.map((r) => r.agentId)))
        agents.set(agentId, await (0, enrich_1.getAgent)(agentId));
    return raw.map((r) => ({
        id: r.id,
        subServiceId,
        subService,
        agentId: r.agentId,
        agent: agents.get(r.agentId),
        date,
        startTime: r.startTime,
        endTime: r.endTime,
        tz: "Africa/Casablanca",
        isBooked: false,
        isBlocked: false,
        blockReason: null,
        createdAt: new Date().toISOString(),
    }));
}
async function listAgendaSlots(query) {
    let targetSubServiceIds;
    if (query.subServiceId) {
        targetSubServiceIds = [query.subServiceId];
    }
    else {
        const rows = await connection_1.db.select({ id: schema_ambassade_1.subServices.id }).from(schema_ambassade_1.subServices).where((0, drizzle_orm_1.eq)(schema_ambassade_1.subServices.active, true));
        targetSubServiceIds = rows.map((r) => r.id);
    }
    const allSlots = [];
    for (const subServiceId of targetSubServiceIds) {
        allSlots.push(...(await generateSlotsForSubService(subServiceId, query.date, query.agentId)));
    }
    if (!allSlots.length)
        return allSlots;
    const bookedSlotIds = new Set((await connection_1.db
        .select({ slotId: schema_rendezvous_1.rendezVous.slotId })
        .from(schema_rendezvous_1.rendezVous)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_rendezvous_1.rendezVous.slotId, allSlots.map((s) => s.id)), notCancelled()))).map((r) => r.slotId));
    return allSlots.map((s) => ({ ...s, isBooked: bookedSlotIds.has(s.id) }));
}
function notCancelled() {
    return (0, drizzle_orm_1.and)((0, drizzle_orm_1.ne)(schema_rendezvous_1.rendezVous.status, "CANCELLED_BY_USER"), (0, drizzle_orm_1.ne)(schema_rendezvous_1.rendezVous.status, "CANCELLED_BY_AGENT"), (0, drizzle_orm_1.ne)(schema_rendezvous_1.rendezVous.status, "NO_SHOW"));
}
async function getAgendaSlot(id) {
    const parts = id.split("|");
    if (parts.length !== 5 || parts[0] !== "slot")
        throw new utils_1.NotFoundError("Créneau introuvable");
    const [, subServiceId, agentId, date, startTime] = parts;
    const slots = await generateSlotsForSubService(subServiceId, date, agentId);
    const match = slots.find((s) => s.startTime === startTime);
    if (!match)
        throw new utils_1.NotFoundError("Créneau introuvable");
    const [booking] = await connection_1.db.select().from(schema_rendezvous_1.rendezVous).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.slotId, id), notCancelled()));
    return { ...match, isBooked: !!booking };
}
async function reconstructSlot(row) {
    if (!row.slotId)
        return null;
    const parts = row.slotId.split("|");
    if (parts.length !== 5)
        return null;
    const startTime = parts[4];
    const dayOfWeek = isoDayOfWeek(row.date);
    const [schedule] = await connection_1.db
        .select()
        .from(schema_ambassade_1.serviceSchedules)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_ambassade_1.serviceSchedules.subServiceId, row.subServiceId), (0, drizzle_orm_1.eq)(schema_ambassade_1.serviceSchedules.dayOfWeek, dayOfWeek)));
    const endTime = schedule ? minutesToTime(timeToMinutes(startTime) + schedule.slotDurationMinutes) : startTime;
    return {
        id: row.slotId,
        subServiceId: row.subServiceId,
        subService: null,
        agentId: row.agentId,
        agent: null,
        date: row.date,
        startTime,
        endTime,
        tz: "Africa/Casablanca",
        isBooked: true,
        isBlocked: false,
        blockReason: null,
        createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    };
}
function visitorAsUser(visitor) {
    return {
        id: null,
        email: null,
        phone: visitor.phone,
        status: null,
        createdAt: null,
        isVisitor: true,
        profile: { firstName: visitor.firstName, lastName: visitor.lastName, city: visitor.city, inue: null },
    };
}
async function enrichRendezVous(row) {
    const [user, subService, agent, demande, slot] = await Promise.all([
        row.userId ? (0, enrich_1.getUser)(row.userId) : Promise.resolve(row.visitor ? visitorAsUser(row.visitor) : null),
        (0, enrich_1.getSubServiceShallow)(row.subServiceId),
        (0, enrich_1.getAgent)(row.agentId),
        row.demandeId ? connection_1.db.select().from(schema_demandes_1.demandes).where((0, drizzle_orm_1.eq)(schema_demandes_1.demandes.id, row.demandeId)).then((r) => r[0] ?? null) : Promise.resolve(null),
        reconstructSlot(row),
    ]);
    return { ...row, user, subService, agent, demande, slot };
}
async function listRendezVous(query) {
    const conditions = [];
    if (query.agentId)
        conditions.push((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.agentId, query.agentId));
    if (query.subServiceId)
        conditions.push((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.subServiceId, query.subServiceId));
    else if (query.subServiceIds)
        conditions.push((0, drizzle_orm_1.inArray)(schema_rendezvous_1.rendezVous.subServiceId, query.subServiceIds));
    if (query.status)
        conditions.push((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.status, query.status));
    if (query.type)
        conditions.push((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.type, query.type));
    if (query.userId)
        conditions.push((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.userId, query.userId));
    if (query.date)
        conditions.push((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.date, query.date));
    if (query.fromDate)
        conditions.push((0, drizzle_orm_1.gte)(schema_rendezvous_1.rendezVous.date, query.fromDate));
    if (query.toDate)
        conditions.push((0, drizzle_orm_1.lte)(schema_rendezvous_1.rendezVous.date, query.toDate));
    const rows = await connection_1.db
        .select()
        .from(schema_rendezvous_1.rendezVous)
        .where(conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined)
        .orderBy(schema_rendezvous_1.rendezVous.date, schema_rendezvous_1.rendezVous.createdAt);
    return Promise.all(rows.map(enrichRendezVous));
}
async function getRendezVous(id) {
    const [row] = await connection_1.db.select().from(schema_rendezvous_1.rendezVous).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Rendez-vous introuvable");
    return enrichRendezVous(row);
}
async function nextTicketId(date, prefix) {
    const compact = date.replace(/-/g, "");
    const [{ count }] = await connection_1.db
        .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
        .from(schema_rendezvous_1.rendezVous)
        .where((0, drizzle_orm_1.like)(schema_rendezvous_1.rendezVous.ticketId, `${prefix}-${compact}-%`));
    const seq = String(count + 1).padStart(3, "0");
    return `${prefix}-${compact}-${seq}`;
}
async function createRendezVous(data, actor) {
    const [existingBooking] = await connection_1.db.select().from(schema_rendezvous_1.rendezVous).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.slotId, data.slotId), notCancelled()));
    if (existingBooking)
        throw new utils_1.ValidationError("Ce créneau n'est plus disponible", { slotId: ["already booked"] });
    const slotParts = data.slotId.split("|");
    const rdvDate = slotParts.length === 5 ? slotParts[3] : new Date().toISOString().slice(0, 10);
    const agentId = slotParts.length === 5 ? slotParts[2] : data.agentId;
    if (!agentId)
        throw new utils_1.ValidationError("Créneau invalide", { slotId: ["cannot resolve agent"] });
    const ticketId = await nextTicketId(rdvDate, "RDV");
    let row;
    try {
        [row] = await connection_1.db
            .insert(schema_rendezvous_1.rendezVous)
            .values({
            id: newId("rdv"),
            demandeId: data.demandeId ?? null,
            userId: data.userId,
            subServiceId: data.subServiceId,
            agentId,
            slotId: data.slotId,
            date: rdvDate,
            ticketId,
            type: "STANDARD",
            status: "PENDING",
            motif: data.motif ?? null,
            createdBy: actor.userId,
        })
            .returning();
    }
    catch (err) {
        if (ambassade_core_1.rendezvousLogic.isSlotConflict(err))
            throw new utils_1.ValidationError("Ce créneau n'est plus disponible", { slotId: ["already booked"] });
        throw err;
    }
    await (0, audit_service_1.writeAudit)({
        action: "CREATE",
        entityType: "RENDEZ_VOUS",
        entityId: row.id,
        actor,
        entitySnapshot: { type: "STANDARD", subServiceId: data.subServiceId },
        details: { ticketId },
    });
    return enrichRendezVous(row);
}
async function createUrgence(data, actor) {
    const today = new Date().toISOString().slice(0, 10);
    const ticketId = await nextTicketId(today, "URG");
    const [row] = await connection_1.db
        .insert(schema_rendezvous_1.rendezVous)
        .values({
        id: newId("rdv"),
        demandeId: data.demandeId ?? null,
        userId: data.userId,
        subServiceId: data.subServiceId,
        agentId: data.agentId,
        slotId: null,
        date: today,
        ticketId,
        type: "URGENCE",
        status: "CONFIRMED",
        motif: data.motif,
        isUrgent: true,
        urgenceJustification: data.urgenceJustification,
        createdBy: actor.userId,
    })
        .returning();
    return enrichRendezVous(row);
}
async function setStatus(id, status, extra = {}) {
    const [existing] = await connection_1.db.select().from(schema_rendezvous_1.rendezVous).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.id, id));
    if (!existing)
        throw new utils_1.NotFoundError("Rendez-vous introuvable");
    const [updated] = await connection_1.db
        .update(schema_rendezvous_1.rendezVous)
        .set({ status, updatedAt: new Date(), ...extra })
        .where((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.id, id))
        .returning();
    const event = existing.status !== status && updated.userId ? ambassade_core_1.notificationsLogic.rendezVousEventForStatus(status) : null;
    if (event && updated.userId) {
        const sub = await (0, enrich_1.getSubServiceShallow)(updated.subServiceId);
        await ambassade_core_1.notificationsLogic.notifyRendezVous(connection_1.db, {
            userId: updated.userId,
            rendezVousId: updated.id,
            event,
            ticketId: updated.ticketId,
            serviceName: sub?.name,
            date: updated.date,
            startTime: updated.slotId?.split("|")[4] ?? "",
        });
    }
    return enrichRendezVous(updated);
}
async function updateStatus(id, status, actor) {
    const [existing] = await connection_1.db.select().from(schema_rendezvous_1.rendezVous).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.id, id));
    const result = await setStatus(id, status);
    await (0, audit_service_1.writeAudit)({
        action: "UPDATE_STATUS",
        entityType: "RENDEZ_VOUS",
        entityId: id,
        actor,
        entitySnapshot: { fromStatus: existing?.status, toStatus: status },
    });
    return result;
}
async function checkIn(id) {
    return setStatus(id, "CHECKED_IN", { checkedInAt: new Date() });
}
async function completeRendezVous(id) {
    return setStatus(id, "COMPLETED", { completedAt: new Date() });
}
async function cancelRendezVous(id, cancelledBy = "AGENT") {
    return setStatus(id, cancelledBy === "USER" ? "CANCELLED_BY_USER" : "CANCELLED_BY_AGENT");
}
function embassyTime(d) {
    if (!d)
        return "--:--";
    return new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Casablanca", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}
function buildScheduleContent(date, rows) {
    const active = rows.filter((r) => r.date === date && !CANCELLED_STATUSES.includes(r.status));
    const byServiceMap = new Map();
    for (const r of active) {
        const key = r.subServiceId;
        if (!byServiceMap.has(key)) {
            byServiceMap.set(key, { subServiceId: key, subServiceName: r.subService?.name ?? key, appointments: [] });
        }
        const startTime = r.slotId?.split("|")[4] ?? embassyTime(r.createdAt);
        byServiceMap.get(key).appointments.push({
            time: startTime,
            endTime: r.slot?.endTime ?? null,
            ticketId: r.ticketId,
            studentName: [r.user?.profile?.firstName, r.user?.profile?.lastName].filter(Boolean).join(" ") || "N/A",
            studentInue: r.user?.profile?.inue ?? "N/A",
            studentPhone: r.user?.phone ?? null,
            motif: r.motif ?? "",
            status: r.status,
            agentName: [r.agent?.user?.profile?.firstName, r.agent?.user?.profile?.lastName].filter(Boolean).join(" ") || "N/A",
            isUrgent: r.isUrgent,
        });
    }
    const byService = [...byServiceMap.values()]
        .sort((x, y) => x.subServiceName.localeCompare(y.subServiceName, "fr"))
        .map((g) => ({ ...g, appointments: g.appointments.sort((p, q) => p.time.localeCompare(q.time) || p.ticketId.localeCompare(q.ticketId)) }));
    return {
        date,
        generatedAt: new Date().toISOString(),
        totalAppointments: active.length,
        byService,
    };
}
async function printDaily(params, actor) {
    const rows = await listRendezVous({
        date: params.date,
        agentId: params.agentId ?? undefined,
        subServiceId: params.subServiceId ?? undefined,
    });
    const content = buildScheduleContent(params.date, rows);
    const [row] = await connection_1.db
        .insert(schema_rendezvous_1.dailySchedulePrints)
        .values({
        id: newId("prn"),
        date: params.date,
        agentId: params.agentId ?? null,
        subServiceId: params.subServiceId ?? null,
        printedBy: actor.userId,
        format: params.format,
        content,
        status: "GENERATED",
    })
        .returning();
    return enrichPrint(row);
}
async function enrichPrint(row) {
    const [agent, subService, printedByAgent] = await Promise.all([
        row.agentId ? (0, enrich_1.getAgent)(row.agentId) : Promise.resolve(null),
        row.subServiceId ? (0, enrich_1.getSubServiceShallow)(row.subServiceId) : Promise.resolve(null),
        (0, enrich_1.getAgentByUserId)(row.printedBy),
    ]);
    return { ...row, agent, subService, printedByAgent };
}
async function printHistory(date) {
    const rows = await connection_1.db.select().from(schema_rendezvous_1.dailySchedulePrints).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.dailySchedulePrints.date, date)).orderBy(schema_rendezvous_1.dailySchedulePrints.printedAt);
    return Promise.all(rows.map(enrichPrint));
}
async function reprint(printId, actor) {
    const [original] = await connection_1.db.select().from(schema_rendezvous_1.dailySchedulePrints).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.dailySchedulePrints.id, printId));
    if (!original)
        throw new utils_1.NotFoundError("Impression introuvable");
    const rows = await listRendezVous({
        date: original.date,
        agentId: original.agentId ?? undefined,
        subServiceId: original.subServiceId ?? undefined,
    });
    const content = buildScheduleContent(original.date, rows);
    const [row] = await connection_1.db
        .insert(schema_rendezvous_1.dailySchedulePrints)
        .values({
        id: newId("prn"),
        date: original.date,
        agentId: original.agentId,
        subServiceId: original.subServiceId,
        printedBy: actor.userId,
        format: original.format,
        content,
        status: "REPRINTED",
    })
        .returning();
    return enrichPrint(row);
}
async function getRendezVousOwnerId(rendezVousId) {
    const [row] = await connection_1.db.select({ userId: schema_rendezvous_1.rendezVous.userId }).from(schema_rendezvous_1.rendezVous).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.id, rendezVousId));
    if (!row)
        throw new utils_1.NotFoundError("Rendez-vous introuvable");
    return row.userId;
}
async function getRendezVousAccessInfo(rendezVousId) {
    const [row] = await connection_1.db
        .select({ userId: schema_rendezvous_1.rendezVous.userId, subServiceId: schema_rendezvous_1.rendezVous.subServiceId })
        .from(schema_rendezvous_1.rendezVous)
        .where((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.id, rendezVousId));
    if (!row)
        throw new utils_1.NotFoundError("Rendez-vous introuvable");
    return row;
}
async function listNotes(rendezVousId) {
    return connection_1.db.select().from(schema_rendezvous_1.rendezVousNotes).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVousNotes.rendezVousId, rendezVousId)).orderBy(schema_rendezvous_1.rendezVousNotes.createdAt);
}
async function addNote(rendezVousId, content, isInternal, actor, isStaff) {
    const [existing] = await connection_1.db.select().from(schema_rendezvous_1.rendezVous).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.id, rendezVousId));
    if (!existing)
        throw new utils_1.NotFoundError("Rendez-vous introuvable");
    const isOwner = existing.userId === actor.userId;
    const [row] = await connection_1.db
        .insert(schema_rendezvous_1.rendezVousNotes)
        .values({
        id: newId("note"),
        rendezVousId,
        authorId: actor.userId,
        authorName: await (0, enrich_1.getActorName)(actor.userId),
        authorType: isOwner && !isStaff ? "STUDENT" : "AGENT",
        content,
        isInternal: isStaff ? isInternal ?? true : false,
    })
        .returning();
    if (isStaff && !row.isInternal && existing.userId && existing.userId !== actor.userId) {
        await ambassade_core_1.notificationsLogic.createNotification(connection_1.db, {
            userId: existing.userId,
            type: "RDV",
            title: "Nouveau message de l'ambassade",
            body: `À propos de votre rendez-vous ${existing.ticketId} : « ${content.length > 200 ? `${content.slice(0, 200)}…` : content} »`,
            payload: { rendezVousId: existing.id, event: "NOTE" },
            actionUrl: ambassade_core_1.notificationsLogic.RENDEZ_VOUS_ACTION_URL,
            email: { subject: `Message de l'ambassade — ${existing.ticketId}`, actionLabel: "Répondre" },
        });
    }
    return row;
}
//# sourceMappingURL=rendezvous.service.js.map