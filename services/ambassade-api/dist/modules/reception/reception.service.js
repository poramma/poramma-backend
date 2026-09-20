"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WALKIN_STATUSES = exports.WALKIN_CATEGORIES = void 0;
exports.createUrgence = createUrgence;
exports.listAppointments = listAppointments;
exports.lookupTicket = lookupTicket;
exports.validateArrival = validateArrival;
exports.listWalkIns = listWalkIns;
exports.createWalkIn = createWalkIn;
exports.updateWalkIn = updateWalkIn;
exports.createDossierFromWalkIn = createDossierFromWalkIn;
exports.summary = summary;
exports.searchMembers = searchMembers;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const connection_1 = require("../../db/connection");
const schema_walkin_1 = require("../../db/schema.walkin");
const schema_rendezvous_1 = require("../../db/schema.rendezvous");
const schema_demandes_1 = require("../../db/schema.demandes");
const schema_ambassade_1 = require("../../db/schema.ambassade");
const schema_etudiants_1 = require("../../db/schema.etudiants");
const schema_identity_readonly_1 = require("../../db/schema.identity-readonly");
const utils_1 = require("@poramma/utils");
const ambassade_core_1 = require("@poramma/ambassade-core");
const enrich_1 = require("../../shared/enrich");
const audit_service_1 = require("../audit/audit.service");
const rdvService = __importStar(require("../rendezvous/rendezvous.service"));
const newId = (prefix) => `${prefix}-${crypto_1.default.randomUUID()}`;
const today = () => ambassade_core_1.rendezvousLogic.nowInEmbassyTz().date;
const fullName = (u) => [u?.profile?.firstName, u?.profile?.lastName].filter(Boolean).join(" ") || u?.email || "—";
const CANCELLED = ["CANCELLED_BY_USER", "CANCELLED_BY_AGENT", "NO_SHOW"];
const ARRIVED = ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"];
function ticketView(r) {
    const agentName = [r.agent?.user?.profile?.firstName, r.agent?.user?.profile?.lastName].filter(Boolean).join(" ");
    return {
        id: r.id,
        ticketId: r.ticketId,
        date: r.date,
        startTime: r.slotId?.split("|")[4] ?? null,
        endTime: r.slot?.endTime ?? null,
        status: r.status,
        type: r.type,
        isUrgent: r.isUrgent,
        motif: r.motif,
        checkedInAt: r.checkedInAt,
        subServiceName: r.subService?.name ?? "—",
        citizen: {
            id: r.userId,
            name: fullName(r.user),
            inue: r.user?.profile?.inue ?? null,
            phone: r.user?.phone ?? null,
            city: r.visitor?.city ?? null,
            isVisitor: !r.userId,
        },
        agentName: agentName || null,
    };
}
async function assignedAgents(subServiceId) {
    const date = today();
    const rows = await connection_1.db
        .select({ agentId: schema_rendezvous_1.agentServiceAssignments.agentId, userId: schema_identity_readonly_1.identityAgents.userId })
        .from(schema_rendezvous_1.agentServiceAssignments)
        .innerJoin(schema_identity_readonly_1.identityAgents, (0, drizzle_orm_1.eq)(schema_identity_readonly_1.identityAgents.id, schema_rendezvous_1.agentServiceAssignments.agentId))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_rendezvous_1.agentServiceAssignments.subServiceId, subServiceId), (0, drizzle_orm_1.eq)(schema_rendezvous_1.agentServiceAssignments.active, true), (0, drizzle_orm_1.eq)(schema_identity_readonly_1.identityAgents.active, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_rendezvous_1.agentServiceAssignments.validFrom), (0, drizzle_orm_1.lte)(schema_rendezvous_1.agentServiceAssignments.validFrom, date)), (0, drizzle_orm_1.or)((0, drizzle_orm_1.isNull)(schema_rendezvous_1.agentServiceAssignments.validUntil), (0, drizzle_orm_1.gte)(schema_rendezvous_1.agentServiceAssignments.validUntil, date))));
    return rows;
}
async function notifyServiceAgents(subServiceId, params, exceptUserId) {
    try {
        for (const agent of await assignedAgents(subServiceId)) {
            if (agent.userId === exceptUserId)
                continue;
            await ambassade_core_1.notificationsLogic.createNotification(connection_1.db, {
                userId: agent.userId,
                type: "RDV",
                title: params.title,
                body: params.body,
                payload: params.payload ?? null,
                actionUrl: "/rendez-vous",
            });
        }
    }
    catch (err) {
        console.error("[reception] notification du service échouée", err);
    }
}
function isUniqueViolation(err) {
    const e = err;
    return e?.code === "23505" || e?.cause?.code === "23505";
}
async function createUrgence(data, actor) {
    if (!data.userId === !data.visitor) {
        throw new utils_1.ValidationError("Indiquez soit un membre de la plateforme, soit l'identité de la personne.", { userId: ["choose one"] });
    }
    const [sub] = await connection_1.db.select().from(schema_ambassade_1.subServices).where((0, drizzle_orm_1.eq)(schema_ambassade_1.subServices.id, data.subServiceId));
    if (!sub || sub.active === false)
        throw new utils_1.NotFoundError("Service introuvable");
    let displayName;
    let phone;
    if (data.userId) {
        const member = await ambassade_core_1.identityLogic.getUser(connection_1.db, data.userId);
        if (!member)
            throw new utils_1.ValidationError("Membre introuvable", { userId: ["unknown user"] });
        displayName = fullName(member);
        phone = member.phone ?? null;
    }
    else {
        displayName = `${data.visitor.firstName} ${data.visitor.lastName}`.trim();
        phone = data.visitor.phone;
    }
    const agents = await assignedAgents(data.subServiceId);
    if (!agents.length) {
        throw new utils_1.ValidationError("Aucun agent n'est affecté à ce service : impossible de prendre le rendez-vous d'urgence. Choisissez un autre service ou prévenez l'administrateur.", {
            subServiceId: ["no agent assigned"],
        });
    }
    const date = today();
    const loads = await connection_1.db
        .select({ agentId: schema_rendezvous_1.rendezVous.agentId, n: (0, drizzle_orm_1.sql) `count(*)::int` })
        .from(schema_rendezvous_1.rendezVous)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.date, date), (0, drizzle_orm_1.inArray)(schema_rendezvous_1.rendezVous.agentId, agents.map((a) => a.agentId))))
        .groupBy(schema_rendezvous_1.rendezVous.agentId);
    const load = (id) => loads.find((l) => l.agentId === id)?.n ?? 0;
    const chosen = [...agents].sort((a, b) => load(a.agentId) - load(b.agentId) || a.agentId.localeCompare(b.agentId))[0];
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const ticketId = await ambassade_core_1.rendezvousLogic.nextTicketId(connection_1.db, date, "URG");
            const [row] = await connection_1.db
                .insert(schema_rendezvous_1.rendezVous)
                .values({
                id: newId("rdv"),
                userId: data.userId ?? null,
                visitor: data.visitor ?? null,
                subServiceId: data.subServiceId,
                agentId: chosen.agentId,
                slotId: null,
                date,
                ticketId,
                type: "URGENCE",
                status: "CONFIRMED",
                motif: data.motif.trim(),
                isUrgent: true,
                urgenceJustification: data.urgenceJustification.trim(),
                createdBy: actor.userId,
            })
                .returning();
            await (0, audit_service_1.writeAudit)({
                action: "CREATE",
                entityType: "RENDEZ_VOUS",
                entityId: row.id,
                actor,
                entitySnapshot: { type: "URGENCE", subServiceId: data.subServiceId, withoutAccount: !data.userId },
                details: { ticketId, atReception: true },
            });
            await notifyServiceAgents(data.subServiceId, {
                title: `Rendez-vous URGENT — ${sub.name}`,
                body: `${displayName}${phone ? ` (${phone})` : ""} se présente à l'accueil. Motif : ${data.motif.trim()}. Urgence : ${data.urgenceJustification.trim()} (ticket ${ticketId}).`,
                payload: { rendezVousId: row.id, event: "URGENCE" },
            });
            return ticketView(await rdvService.getRendezVous(row.id));
        }
        catch (err) {
            if (isUniqueViolation(err))
                continue;
            throw err;
        }
    }
    throw new utils_1.ConflictError("Impossible d'attribuer un numéro de ticket, réessayez.");
}
async function listAppointments(params) {
    const date = params.date ?? today();
    const rows = (await rdvService.listRendezVous({ date })).filter((r) => !CANCELLED.includes(r.status));
    const views = rows.map(ticketView);
    const q = params.q?.trim().toLowerCase();
    const filtered = q
        ? views.filter((v) => [v.ticketId, v.citizen.name, v.citizen.inue, v.citizen.phone, v.subServiceName].some((x) => x?.toLowerCase().includes(q)))
        : views;
    return filtered.sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99") || a.ticketId.localeCompare(b.ticketId));
}
async function lookupTicket(ticket) {
    const wanted = ticket.trim().toUpperCase();
    const [row] = await connection_1.db.select({ id: schema_rendezvous_1.rendezVous.id }).from(schema_rendezvous_1.rendezVous).where((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.ticketId, wanted));
    if (!row)
        throw new utils_1.NotFoundError("Aucun rendez-vous ne correspond à ce ticket.");
    return ticketView(await rdvService.getRendezVous(row.id));
}
async function validateArrival(id, actor) {
    const rdv = await rdvService.getRendezVous(id);
    if (CANCELLED.includes(rdv.status))
        throw new utils_1.ConflictError("Ce rendez-vous est annulé : le ticket n'est plus valable.");
    if (ARRIVED.includes(rdv.status))
        throw new utils_1.ConflictError("Ce ticket a déjà été validé.");
    const now = today();
    if (rdv.date > now)
        throw new utils_1.ConflictError(`Ce rendez-vous est prévu le ${rdv.date} : il ne peut pas être validé aujourd'hui.`);
    if (rdv.date < now)
        throw new utils_1.ConflictError(`Ce ticket est périmé (rendez-vous du ${rdv.date}).`);
    const updated = await rdvService.checkIn(id);
    await (0, audit_service_1.writeAudit)({
        action: "CHECK_IN",
        entityType: "RENDEZ_VOUS",
        entityId: id,
        actor,
        entitySnapshot: { fromStatus: rdv.status, toStatus: "CHECKED_IN" },
        details: { ticketId: rdv.ticketId, atReception: true },
    });
    try {
        const agent = await (0, enrich_1.getAgent)(rdv.agentId);
        if (agent?.userId) {
            await ambassade_core_1.notificationsLogic.createNotification(connection_1.db, {
                userId: agent.userId,
                type: "RDV",
                title: `Usager arrivé — ${rdv.ticketId}`,
                body: `${fullName(rdv.user)} est à l'accueil pour son rendez-vous de ${rdv.slotId?.split("|")[4] ?? "ce jour"} (${rdv.subService?.name ?? "service"}).`,
                payload: { rendezVousId: id, event: "ARRIVED" },
                actionUrl: "/rendez-vous",
            });
        }
    }
    catch (err) {
        console.error("[reception] notification de l'agent échouée", err);
    }
    return ticketView(updated);
}
exports.WALKIN_CATEGORIES = ["INFORMATION", "DEPOT", "RETRAIT", "SUIVI", "AUTRE"];
exports.WALKIN_STATUSES = ["WAITING", "IN_SERVICE", "DONE", "REDIRECTED", "ABANDONED"];
const FINAL = ["DONE", "REDIRECTED", "ABANDONED"];
async function enrichWalkIns(rows) {
    if (!rows.length)
        return [];
    const subIds = [...new Set(rows.flatMap((r) => [r.subServiceId, r.redirectedSubServiceId]).filter((x) => !!x))];
    const demandeIds = rows.map((r) => r.demandeId).filter((x) => !!x);
    const userIds = [...rows.flatMap((r) => [r.userId, r.registeredBy, r.assignedAgentId]).filter((x) => !!x)];
    const [subs, dems, users] = await Promise.all([
        subIds.length ? connection_1.db.select({ id: schema_ambassade_1.subServices.id, name: schema_ambassade_1.subServices.name }).from(schema_ambassade_1.subServices).where((0, drizzle_orm_1.inArray)(schema_ambassade_1.subServices.id, subIds)) : Promise.resolve([]),
        demandeIds.length ? connection_1.db.select({ id: schema_demandes_1.demandes.id, dossierNumber: schema_demandes_1.demandes.dossierNumber }).from(schema_demandes_1.demandes).where((0, drizzle_orm_1.inArray)(schema_demandes_1.demandes.id, demandeIds)) : Promise.resolve([]),
        ambassade_core_1.identityLogic.getUsersByIds(connection_1.db, userIds),
    ]);
    return rows.map((r) => ({
        id: r.id,
        reference: r.reference,
        visitorName: r.visitorName,
        visitorPhone: r.visitorPhone,
        member: r.userId ? { id: r.userId, name: fullName(users.get(r.userId)), inue: users.get(r.userId)?.profile?.inue ?? null } : null,
        subService: r.subServiceId ? { id: r.subServiceId, name: subs.find((s) => s.id === r.subServiceId)?.name ?? "—" } : null,
        category: r.category,
        subject: r.subject,
        notes: r.notes,
        status: r.status,
        priority: r.priority,
        outcome: r.outcome,
        redirectedTo: r.redirectedSubServiceId ? { id: r.redirectedSubServiceId, name: subs.find((s) => s.id === r.redirectedSubServiceId)?.name ?? "—" } : null,
        demande: r.demandeId ? { id: r.demandeId, dossierNumber: dems.find((d) => d.id === r.demandeId)?.dossierNumber ?? null } : null,
        registeredByName: fullName(users.get(r.registeredBy)),
        createdAt: r.createdAt,
        startedAt: r.startedAt,
        closedAt: r.closedAt,
    }));
}
async function listWalkIns(params) {
    const conditions = [];
    if (params.date) {
        conditions.push((0, drizzle_orm_1.sql) `(${schema_walkin_1.walkInRequests.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE ${ambassade_core_1.rendezvousLogic.TZ})::date = ${params.date}::date`);
    }
    if (params.status === "ACTIVE")
        conditions.push((0, drizzle_orm_1.inArray)(schema_walkin_1.walkInRequests.status, ["WAITING", "IN_SERVICE"]));
    else if (params.status)
        conditions.push((0, drizzle_orm_1.eq)(schema_walkin_1.walkInRequests.status, params.status));
    if (params.q?.trim()) {
        const s = `%${params.q.trim()}%`;
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_walkin_1.walkInRequests.reference, s), (0, drizzle_orm_1.ilike)(schema_walkin_1.walkInRequests.visitorName, s), (0, drizzle_orm_1.ilike)(schema_walkin_1.walkInRequests.subject, s), (0, drizzle_orm_1.ilike)(schema_walkin_1.walkInRequests.visitorPhone, s)));
    }
    const rows = await connection_1.db
        .select()
        .from(schema_walkin_1.walkInRequests)
        .where(conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined)
        .orderBy((0, drizzle_orm_1.sql) `CASE WHEN ${schema_walkin_1.walkInRequests.status} IN ('DONE','REDIRECTED','ABANDONED') THEN 1 ELSE 0 END`, (0, drizzle_orm_1.sql) `CASE ${schema_walkin_1.walkInRequests.priority} WHEN 'URGENT' THEN 0 ELSE 1 END`, schema_walkin_1.walkInRequests.createdAt)
        .limit(300);
    return enrichWalkIns(rows);
}
async function nextReference() {
    const compact = today().replace(/-/g, "");
    const [{ count }] = await connection_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)::int` }).from(schema_walkin_1.walkInRequests).where((0, drizzle_orm_1.like)(schema_walkin_1.walkInRequests.reference, `ACC-${compact}-%`));
    return `ACC-${compact}-${String(count + 1).padStart(3, "0")}`;
}
async function createWalkIn(data, actor) {
    let visitorName = data.visitorName?.trim() ?? "";
    let phone = data.visitorPhone?.trim() || null;
    if (data.userId) {
        const member = await ambassade_core_1.identityLogic.getUser(connection_1.db, data.userId);
        if (!member)
            throw new utils_1.ValidationError("Membre introuvable", { userId: ["unknown user"] });
        visitorName = visitorName || fullName(member);
        phone = phone ?? member.phone ?? null;
    }
    if (!visitorName)
        throw new utils_1.ValidationError("Indiquez le nom du visiteur", { visitorName: ["required"] });
    if (data.subServiceId) {
        const [sub] = await connection_1.db.select({ id: schema_ambassade_1.subServices.id }).from(schema_ambassade_1.subServices).where((0, drizzle_orm_1.eq)(schema_ambassade_1.subServices.id, data.subServiceId));
        if (!sub)
            throw new utils_1.ValidationError("Service introuvable", { subServiceId: ["unknown sub-service"] });
    }
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            const [row] = await connection_1.db
                .insert(schema_walkin_1.walkInRequests)
                .values({
                id: newId("walk"),
                reference: await nextReference(),
                visitorName,
                visitorPhone: phone,
                userId: data.userId ?? null,
                subServiceId: data.subServiceId ?? null,
                category: data.category,
                subject: data.subject.trim(),
                notes: data.notes?.trim() || null,
                priority: data.priority ?? "NORMAL",
                registeredBy: actor.userId,
            })
                .returning();
            await (0, audit_service_1.writeAudit)({
                action: "CREATE",
                entityType: "DEMANDE_SUR_PLACE",
                entityId: row.id,
                actor,
                entitySnapshot: { reference: row.reference, category: row.category, subServiceId: row.subServiceId },
                details: { reference: row.reference },
            });
            return (await enrichWalkIns([row]))[0];
        }
        catch (err) {
            const e = err;
            if (e?.code === "23505" || e?.cause?.code === "23505")
                continue;
            throw err;
        }
    }
    throw new utils_1.ConflictError("Impossible d'attribuer un numéro d'ordre, réessayez.");
}
async function getWalkInRow(id) {
    const [row] = await connection_1.db.select().from(schema_walkin_1.walkInRequests).where((0, drizzle_orm_1.eq)(schema_walkin_1.walkInRequests.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Demande sur place introuvable");
    return row;
}
async function updateWalkIn(id, patch, actor) {
    const row = await getWalkInRow(id);
    if (FINAL.includes(row.status))
        throw new utils_1.ConflictError("Cette demande est clôturée : elle ne peut plus être modifiée.");
    const now = new Date();
    const set = { updatedAt: now };
    if (patch.priority)
        set.priority = patch.priority;
    if (patch.notes !== undefined)
        set.notes = patch.notes?.trim() || null;
    if (patch.outcome !== undefined)
        set.outcome = patch.outcome?.trim() || null;
    if (patch.subServiceId !== undefined) {
        if (patch.subServiceId) {
            const [sub] = await connection_1.db.select({ id: schema_ambassade_1.subServices.id }).from(schema_ambassade_1.subServices).where((0, drizzle_orm_1.eq)(schema_ambassade_1.subServices.id, patch.subServiceId));
            if (!sub)
                throw new utils_1.ValidationError("Service introuvable", { subServiceId: ["unknown sub-service"] });
        }
        set.subServiceId = patch.subServiceId;
    }
    let redirectTarget = null;
    if (patch.status === "REDIRECTED" && row.status !== "REDIRECTED") {
        if (!patch.redirectedSubServiceId)
            throw new utils_1.ValidationError("Précisez le service vers lequel le visiteur est orienté.", { redirectedSubServiceId: ["required"] });
        const [target] = await connection_1.db.select({ id: schema_ambassade_1.subServices.id, name: schema_ambassade_1.subServices.name }).from(schema_ambassade_1.subServices).where((0, drizzle_orm_1.eq)(schema_ambassade_1.subServices.id, patch.redirectedSubServiceId));
        if (!target)
            throw new utils_1.ValidationError("Service d'orientation introuvable", { redirectedSubServiceId: ["unknown sub-service"] });
        redirectTarget = target;
        set.redirectedSubServiceId = target.id;
        set.outcome = [`Orienté vers ${target.name}`, patch.outcome?.trim()].filter(Boolean).join(" — ");
    }
    if (patch.status && patch.status !== row.status) {
        if (patch.status === "WAITING")
            throw new utils_1.ValidationError("Une demande en cours de traitement ne repasse pas en attente.", { status: ["invalid transition"] });
        set.status = patch.status;
        if (patch.status === "IN_SERVICE")
            set.startedAt = now;
        if (FINAL.includes(patch.status)) {
            set.closedAt = now;
            set.startedAt = row.startedAt ?? now;
        }
    }
    const [updated] = await connection_1.db.update(schema_walkin_1.walkInRequests).set(set).where((0, drizzle_orm_1.eq)(schema_walkin_1.walkInRequests.id, id)).returning();
    if (patch.status && patch.status !== row.status) {
        await (0, audit_service_1.writeAudit)({
            action: "UPDATE_STATUS",
            entityType: "DEMANDE_SUR_PLACE",
            entityId: id,
            actor,
            entitySnapshot: { fromStatus: row.status, toStatus: patch.status },
            details: { reference: row.reference, ...(redirectTarget ? { redirectedTo: redirectTarget.name } : {}) },
        });
    }
    if (redirectTarget) {
        await notifyServiceAgents(redirectTarget.id, {
            title: `Visiteur orienté vers ${redirectTarget.name}`,
            body: `${row.visitorName}${row.visitorPhone ? ` (${row.visitorPhone})` : ""} vous est orienté(e) depuis l'accueil (${row.reference}) : ${row.subject}`,
            payload: { walkInId: id, event: "REDIRECTED" },
        });
    }
    return (await enrichWalkIns([updated]))[0];
}
async function createDossierFromWalkIn(id, actor) {
    const row = await getWalkInRow(id);
    if (row.demandeId)
        throw new utils_1.ConflictError("Un dossier a déjà été créé pour cette demande.");
    if (!row.userId)
        throw new utils_1.ValidationError("Rattachez d'abord un compte membre à cette demande pour créer un dossier.", { userId: ["required"] });
    if (!row.subServiceId)
        throw new utils_1.ValidationError("Choisissez le service concerné pour créer un dossier.", { subServiceId: ["required"] });
    const demande = await ambassade_core_1.demandesLogic.createDemande(connection_1.db, {
        userId: row.userId,
        subServiceId: row.subServiceId,
        customPayload: { source: "ACCUEIL", accueilReference: row.reference, objet: row.subject },
    });
    await connection_1.db.insert(schema_demandes_1.demandeHistories).values({
        id: newId("hist"),
        demandeId: demande.id,
        action: "STATUS_CHANGE",
        fromStatus: "SUBMITTED",
        toStatus: "SUBMITTED",
        actorUserId: actor.userId,
        actorRole: actor.roleName,
        actorName: await (0, enrich_1.getActorName)(actor.userId),
        comment: `Demande déposée sur place, à l'accueil de l'ambassade (${row.reference}).`,
        isVisibleToUser: true,
    });
    await connection_1.db.update(schema_walkin_1.walkInRequests).set({ demandeId: demande.id, updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(schema_walkin_1.walkInRequests.id, id));
    await (0, audit_service_1.writeAudit)({
        action: "CREATE",
        entityType: "DEMANDE",
        entityId: demande.id,
        actor,
        details: { dossierNumber: demande.dossierNumber, fromWalkIn: row.reference },
    });
    return (await enrichWalkIns([await getWalkInRow(id)]))[0];
}
async function summary() {
    const date = today();
    const [rdvs, walkIns] = await Promise.all([
        connection_1.db
            .select({ status: schema_rendezvous_1.rendezVous.status, n: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_rendezvous_1.rendezVous)
            .where((0, drizzle_orm_1.eq)(schema_rendezvous_1.rendezVous.date, date))
            .groupBy(schema_rendezvous_1.rendezVous.status),
        connection_1.db
            .select({ status: schema_walkin_1.walkInRequests.status, n: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(schema_walkin_1.walkInRequests)
            .where((0, drizzle_orm_1.sql) `(${schema_walkin_1.walkInRequests.createdAt} AT TIME ZONE 'UTC' AT TIME ZONE ${ambassade_core_1.rendezvousLogic.TZ})::date = ${date}::date`)
            .groupBy(schema_walkin_1.walkInRequests.status),
    ]);
    const count = (rows, statuses) => rows.filter((r) => statuses.includes(r.status)).reduce((s, r) => s + r.n, 0);
    return {
        date,
        rendezVous: {
            expected: count(rdvs, ["PENDING", "CONFIRMED"]),
            arrived: count(rdvs, ARRIVED),
            total: count(rdvs, ["PENDING", "CONFIRMED", ...ARRIVED]),
        },
        walkIns: {
            waiting: count(walkIns, ["WAITING"]),
            inService: count(walkIns, ["IN_SERVICE"]),
            closed: count(walkIns, FINAL),
            total: walkIns.reduce((s, r) => s + r.n, 0),
        },
    };
}
async function searchMembers(query) {
    const s = `%${query.trim()}%`;
    const rows = await connection_1.db
        .select({
        id: schema_identity_readonly_1.identityUsers.id,
        email: schema_identity_readonly_1.identityUsers.email,
        phone: schema_identity_readonly_1.identityUsers.phone,
        firstName: schema_identity_readonly_1.identityUserProfiles.firstName,
        lastName: schema_identity_readonly_1.identityUserProfiles.lastName,
        inue: schema_etudiants_1.etudiants.inue,
        profileInue: schema_identity_readonly_1.identityUserProfiles.inue,
    })
        .from(schema_identity_readonly_1.identityUsers)
        .leftJoin(schema_identity_readonly_1.identityUserProfiles, (0, drizzle_orm_1.eq)(schema_identity_readonly_1.identityUserProfiles.userId, schema_identity_readonly_1.identityUsers.id))
        .leftJoin(schema_etudiants_1.etudiants, (0, drizzle_orm_1.eq)(schema_etudiants_1.etudiants.userId, schema_identity_readonly_1.identityUsers.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.sql) `not exists (select 1 from identity.agents a where a.user_id = ${schema_identity_readonly_1.identityUsers.id})`, (0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(schema_identity_readonly_1.identityUsers.email, s), (0, drizzle_orm_1.ilike)(schema_identity_readonly_1.identityUsers.phone, s), (0, drizzle_orm_1.ilike)(schema_identity_readonly_1.identityUserProfiles.firstName, s), (0, drizzle_orm_1.ilike)(schema_identity_readonly_1.identityUserProfiles.lastName, s), (0, drizzle_orm_1.ilike)((0, drizzle_orm_1.sql) `concat(${schema_identity_readonly_1.identityUserProfiles.firstName}, ' ', ${schema_identity_readonly_1.identityUserProfiles.lastName})`, s), (0, drizzle_orm_1.ilike)(schema_etudiants_1.etudiants.inue, s))))
        .limit(8);
    return rows.map((r) => ({
        id: r.id,
        name: [r.firstName, r.lastName].filter(Boolean).join(" ") || r.email,
        email: r.email,
        phone: r.phone,
        inue: r.inue ?? r.profileInue ?? null,
    }));
}
//# sourceMappingURL=reception.service.js.map