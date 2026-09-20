"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CULTURE_ROLE = void 0;
exports.listAdvisors = listAdvisors;
exports.advisorByAgentId = advisorByAgentId;
exports.culturalSubServiceIds = culturalSubServiceIds;
exports.isCulturalSubService = isCulturalSubService;
exports.cultureStaffIds = cultureStaffIds;
exports.notifyCultureStaff = notifyCultureStaff;
exports.notifyAdvisorRendezVous = notifyAdvisorRendezVous;
exports.createThread = createThread;
exports.listThreadsForUser = listThreadsForUser;
exports.getThreadForUser = getThreadForUser;
exports.addUserMessage = addUserMessage;
exports.threadStats = threadStats;
exports.listThreads = listThreads;
exports.getThreadForStaff = getThreadForStaff;
exports.addStaffMessage = addStaffMessage;
exports.setThreadStatus = setThreadStatus;
exports.requesterSummary = requesterSummary;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const culture_1 = require("../schema/culture");
const services_1 = require("../schema/services");
const identity_1 = require("../schema/identity");
const identity_2 = require("./identity");
const notifications_1 = require("./notifications");
exports.CULTURE_ROLE = "CULTURAL_ADVISOR";
const DEFAULT_TITLE = "Conseiller Culturel";
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
const excerpt = (text, max = 220) => (text.length > max ? `${text.slice(0, max)}…` : text);
async function newReference(db) {
    for (let i = 0; i < 6; i++) {
        const reference = `CUL-${new Date().getFullYear()}-${crypto_1.default.randomBytes(3).toString("hex").toUpperCase()}`;
        const [clash] = await db.select({ id: culture_1.cultureThreads.id }).from(culture_1.cultureThreads).where((0, drizzle_orm_1.eq)(culture_1.cultureThreads.reference, reference));
        if (!clash)
            return reference;
    }
    throw new utils_1.ConflictError("Impossible de générer un numéro d'échange, réessayez.");
}
async function listAdvisors(db) {
    const rows = await db
        .select({ userId: identity_1.identityAgents.userId, agentId: identity_1.identityAgents.id, roleTitle: identity_1.identityAgents.roleTitle })
        .from(identity_1.identityUserRoles)
        .innerJoin(identity_1.identityRoles, (0, drizzle_orm_1.eq)(identity_1.identityRoles.id, identity_1.identityUserRoles.roleId))
        .innerJoin(identity_1.identityAgents, (0, drizzle_orm_1.eq)(identity_1.identityAgents.userId, identity_1.identityUserRoles.userId))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(identity_1.identityRoles.name, exports.CULTURE_ROLE), (0, drizzle_orm_1.eq)(identity_1.identityUserRoles.isActive, true), (0, drizzle_orm_1.eq)(identity_1.identityAgents.active, true)));
    const users = await (0, identity_2.getUsersByIds)(db, rows.map((r) => r.userId));
    return rows
        .map((r) => {
        const p = users.get(r.userId)?.profile;
        const name = [p?.firstName, p?.lastName].filter(Boolean).join(" ") || "Conseiller Culturel";
        return { userId: r.userId, agentId: r.agentId, name, title: r.roleTitle?.trim() || DEFAULT_TITLE };
    })
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
async function advisorByAgentId(db, agentId) {
    if (!agentId)
        return null;
    return (await listAdvisors(db)).find((a) => a.agentId === agentId) ?? null;
}
async function culturalSubServiceIds(db) {
    const rows = await db
        .select({ id: services_1.subServices.id })
        .from(services_1.subServices)
        .innerJoin(services_1.services, (0, drizzle_orm_1.eq)(services_1.services.id, services_1.subServices.serviceId))
        .where((0, drizzle_orm_1.eq)(services_1.services.isCultural, true));
    return rows.map((r) => r.id);
}
async function isCulturalSubService(db, subServiceId) {
    return (await culturalSubServiceIds(db)).includes(subServiceId);
}
async function adminIds(db) {
    const rows = await db
        .selectDistinct({ userId: identity_1.identityUserRoles.userId })
        .from(identity_1.identityUserRoles)
        .innerJoin(identity_1.identityRoles, (0, drizzle_orm_1.eq)(identity_1.identityRoles.id, identity_1.identityUserRoles.roleId))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(identity_1.identityRoles.name, "ADMIN"), (0, drizzle_orm_1.eq)(identity_1.identityUserRoles.isActive, true)));
    return rows.map((r) => r.userId);
}
async function cultureStaffIds(db) {
    const advisors = (await listAdvisors(db)).map((a) => a.userId);
    return advisors.length ? advisors : adminIds(db);
}
async function notifyCultureStaff(db, params) {
    for (const userId of await cultureStaffIds(db)) {
        if (userId === params.exceptUserId)
            continue;
        await (0, notifications_1.createNotification)(db, {
            userId,
            type: "CULTURE",
            title: params.title,
            body: params.body,
            payload: params.payload ?? null,
            actionUrl: params.actionUrl,
            email: { subject: params.title },
        });
    }
}
const RDV_EVENT_TITLE = {
    BOOKED: "Nouveau rendez-vous",
    RESCHEDULED: "Rendez-vous déplacé",
    CANCELLED: "Rendez-vous annulé",
};
async function notifyAdvisorRendezVous(db, params) {
    try {
        const advisor = await advisorByAgentId(db, params.agentId);
        if (!advisor)
            return;
        const name = await (0, identity_2.getActorName)(db, params.userId);
        await (0, notifications_1.createNotification)(db, {
            userId: advisor.userId,
            type: "CULTURE",
            title: `${RDV_EVENT_TITLE[params.event]} — ${params.ticketId}`,
            body: `${name} · ${params.date}${params.startTime ? ` à ${params.startTime}` : ""}`,
            payload: { ticketId: params.ticketId },
            actionUrl: "/culture",
        });
    }
    catch (err) {
        console.error("[culture] notification du conseiller échouée", err);
    }
}
async function advisorDisplay(db, advisorId) {
    if (!advisorId)
        return { name: null, title: DEFAULT_TITLE };
    const [agent] = await db.select({ roleTitle: identity_1.identityAgents.roleTitle }).from(identity_1.identityAgents).where((0, drizzle_orm_1.eq)(identity_1.identityAgents.userId, advisorId));
    return { name: await (0, identity_2.getActorName)(db, advisorId), title: agent?.roleTitle?.trim() || DEFAULT_TITLE };
}
function publicThread(t, advisor) {
    return {
        id: t.id,
        reference: t.reference,
        subject: t.subject,
        status: t.status,
        advisor,
        createdAt: t.createdAt,
        lastMessageAt: t.lastMessageAt,
        lastMessageBy: t.lastMessageBy,
        closedAt: t.closedAt,
    };
}
function publicMessage(m) {
    return {
        id: m.id,
        authorType: m.authorType,
        authorName: m.authorType === "SYSTEM" ? null : m.authorName,
        content: m.content,
        createdAt: m.createdAt,
    };
}
async function getThreadRow(db, id) {
    const [row] = await db.select().from(culture_1.cultureThreads).where((0, drizzle_orm_1.eq)(culture_1.cultureThreads.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Échange introuvable");
    return row;
}
async function ownedThread(db, userId, id) {
    const row = await getThreadRow(db, id);
    if (row.userId !== userId)
        throw new utils_1.NotFoundError("Échange introuvable");
    return row;
}
async function createThread(db, userId, data) {
    const id = newId("cth");
    const reference = await newReference(db);
    const name = await (0, identity_2.getActorName)(db, userId);
    const [thread] = await db.insert(culture_1.cultureThreads).values({ id, reference, userId, subject: data.subject }).returning();
    await db.insert(culture_1.cultureMessages).values({ id: newId("cmsg"), threadId: id, authorId: userId, authorType: "USER", authorName: name, content: data.message });
    await notifyCultureStaff(db, {
        title: `Nouveau message — ${data.subject}`,
        body: `${name} écrit au Conseiller Culturel (${reference}) :\n\n${excerpt(data.message)}`,
        payload: { cultureThreadId: id, reference },
        actionUrl: `/culture/echanges/${id}`,
    });
    await (0, notifications_1.createNotification)(db, {
        userId,
        type: "CULTURE",
        title: "Votre message a bien été transmis",
        body: `Le Conseiller Culturel a reçu « ${data.subject} ». Numéro de suivi : ${reference}. Vous serez prévenu(e) dès sa réponse.`,
        payload: { cultureThreadId: id, reference },
        actionUrl: `/culture/echanges/${id}`,
        email: { subject: `Message transmis au Conseiller Culturel (${reference})`, actionLabel: "Suivre l'échange" },
    });
    return publicThread(thread, await advisorDisplay(db, null));
}
async function listThreadsForUser(db, userId) {
    const rows = await db.select().from(culture_1.cultureThreads).where((0, drizzle_orm_1.eq)(culture_1.cultureThreads.userId, userId)).orderBy((0, drizzle_orm_1.desc)(culture_1.cultureThreads.lastMessageAt));
    const advisors = new Map();
    for (const id of new Set(rows.map((r) => r.advisorId).filter((x) => !!x)))
        advisors.set(id, await advisorDisplay(db, id));
    return rows.map((t) => publicThread(t, t.advisorId ? advisors.get(t.advisorId) : { name: null, title: DEFAULT_TITLE }));
}
async function getThreadForUser(db, userId, id) {
    const thread = await ownedThread(db, userId, id);
    const messages = await db
        .select()
        .from(culture_1.cultureMessages)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(culture_1.cultureMessages.threadId, id), (0, drizzle_orm_1.eq)(culture_1.cultureMessages.isInternal, false)))
        .orderBy(culture_1.cultureMessages.createdAt);
    return { ...publicThread(thread, await advisorDisplay(db, thread.advisorId)), messages: messages.map(publicMessage) };
}
async function addUserMessage(db, userId, id, content) {
    const thread = await ownedThread(db, userId, id);
    if (thread.status === "CLOSED")
        throw new utils_1.ConflictError("Cet échange est clos. Ouvrez un nouvel échange si vous avez encore besoin du Conseiller Culturel.");
    const name = await (0, identity_2.getActorName)(db, userId);
    const [message] = await db
        .insert(culture_1.cultureMessages)
        .values({ id: newId("cmsg"), threadId: id, authorId: userId, authorType: "USER", authorName: name, content })
        .returning();
    await db.update(culture_1.cultureThreads).set({ status: "OPEN", lastMessageAt: new Date(), lastMessageBy: "USER", updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(culture_1.cultureThreads.id, id));
    if (thread.advisorId) {
        await (0, notifications_1.createNotification)(db, {
            userId: thread.advisorId,
            type: "CULTURE",
            title: `Nouvelle réponse — ${thread.subject}`,
            body: `${name} : ${excerpt(content)}`,
            payload: { cultureThreadId: id, reference: thread.reference },
            actionUrl: `/culture/echanges/${id}`,
            email: { subject: `[Culture ${thread.reference}] Nouvelle réponse` },
        });
    }
    else {
        await notifyCultureStaff(db, {
            title: `Nouvelle réponse — ${thread.subject}`,
            body: `${name} : ${excerpt(content)}`,
            payload: { cultureThreadId: id, reference: thread.reference },
            actionUrl: `/culture/echanges/${id}`,
        });
    }
    return publicMessage(message);
}
async function enrichStaff(db, rows) {
    const users = await (0, identity_2.getUsersByIds)(db, rows.flatMap((t) => [t.userId, t.advisorId].filter((x) => !!x)));
    const nameOf = (id) => {
        if (!id)
            return null;
        const u = users.get(id);
        return u ? [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(" ") || u.email : null;
    };
    return rows.map((t) => {
        const u = users.get(t.userId);
        return {
            id: t.id,
            reference: t.reference,
            subject: t.subject,
            status: t.status,
            requester: { id: t.userId, name: nameOf(t.userId), email: u?.email ?? null, phone: u?.phone ?? null, inue: u?.profile?.inue ?? null },
            advisor: t.advisorId ? { id: t.advisorId, name: nameOf(t.advisorId) } : null,
            createdAt: t.createdAt,
            lastMessageAt: t.lastMessageAt,
            lastMessageBy: t.lastMessageBy,
            closedAt: t.closedAt,
        };
    });
}
async function threadStats(db) {
    const counts = await db.select({ status: culture_1.cultureThreads.status, n: (0, drizzle_orm_1.sql) `count(*)::int` }).from(culture_1.cultureThreads).groupBy(culture_1.cultureThreads.status);
    const by = Object.fromEntries(counts.map((c) => [c.status, c.n]));
    return { open: by.OPEN ?? 0, answered: by.ANSWERED ?? 0, closed: by.CLOSED ?? 0 };
}
async function listThreads(db, filters) {
    const conditions = [];
    if (filters.status === "ACTIVE")
        conditions.push((0, drizzle_orm_1.inArray)(culture_1.cultureThreads.status, ["OPEN", "ANSWERED"]));
    else if (filters.status)
        conditions.push((0, drizzle_orm_1.eq)(culture_1.cultureThreads.status, filters.status));
    if (filters.search?.trim()) {
        const s = `%${filters.search.trim()}%`;
        const requesterIds = db
            .select({ id: identity_1.identityUsers.id })
            .from(identity_1.identityUsers)
            .leftJoin(identity_1.identityUserProfiles, (0, drizzle_orm_1.eq)(identity_1.identityUserProfiles.userId, identity_1.identityUsers.id))
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(identity_1.identityUsers.email, s), (0, drizzle_orm_1.ilike)(identity_1.identityUserProfiles.firstName, s), (0, drizzle_orm_1.ilike)(identity_1.identityUserProfiles.lastName, s)));
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(culture_1.cultureThreads.reference, s), (0, drizzle_orm_1.ilike)(culture_1.cultureThreads.subject, s), (0, drizzle_orm_1.inArray)(culture_1.cultureThreads.userId, requesterIds)));
    }
    const where = conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const rank = (0, drizzle_orm_1.sql) `CASE ${culture_1.cultureThreads.status} WHEN 'OPEN' THEN 0 WHEN 'ANSWERED' THEN 1 ELSE 2 END`;
    const [rows, [{ total }], stats] = await Promise.all([
        db.select().from(culture_1.cultureThreads).where(where).orderBy(rank, (0, drizzle_orm_1.desc)(culture_1.cultureThreads.lastMessageAt)).limit(limit).offset((page - 1) * limit),
        db.select({ total: (0, drizzle_orm_1.sql) `count(*)::int` }).from(culture_1.cultureThreads).where(where),
        threadStats(db),
    ]);
    return { data: await enrichStaff(db, rows), total, page, limit, stats };
}
async function getThreadForStaff(db, id) {
    const thread = await getThreadRow(db, id);
    const [[enriched], messages] = await Promise.all([
        enrichStaff(db, [thread]),
        db.select().from(culture_1.cultureMessages).where((0, drizzle_orm_1.eq)(culture_1.cultureMessages.threadId, id)).orderBy(culture_1.cultureMessages.createdAt),
    ]);
    return {
        ...enriched,
        messages: messages.map((m) => ({ id: m.id, authorType: m.authorType, authorName: m.authorName, content: m.content, isInternal: m.isInternal, createdAt: m.createdAt })),
    };
}
async function addStaffMessage(db, id, actorId, content, isInternal) {
    const thread = await getThreadRow(db, id);
    if (thread.status === "CLOSED" && !isInternal)
        throw new utils_1.ConflictError("Cet échange est clos : rouvrez-le avant de répondre.");
    const actorName = await (0, identity_2.getActorName)(db, actorId);
    await db.insert(culture_1.cultureMessages).values({ id: newId("cmsg"), threadId: id, authorId: actorId, authorType: "ADVISOR", authorName: actorName, content, isInternal });
    if (isInternal) {
        await db.update(culture_1.cultureThreads).set({ updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(culture_1.cultureThreads.id, id));
        return getThreadForStaff(db, id);
    }
    const now = new Date();
    await db
        .update(culture_1.cultureThreads)
        .set({ status: "ANSWERED", advisorId: thread.advisorId ?? actorId, lastMessageAt: now, lastMessageBy: "ADVISOR", updatedAt: now })
        .where((0, drizzle_orm_1.eq)(culture_1.cultureThreads.id, id));
    await (0, notifications_1.createNotification)(db, {
        userId: thread.userId,
        type: "CULTURE",
        title: `${actorName} vous a répondu`,
        body: `Réponse à « ${thread.subject} » :\n\n${excerpt(content)}`,
        payload: { cultureThreadId: id, reference: thread.reference },
        actionUrl: `/culture/echanges/${id}`,
        email: { subject: `Réponse du Conseiller Culturel (${thread.reference})`, actionLabel: "Voir la réponse" },
    });
    return getThreadForStaff(db, id);
}
async function setThreadStatus(db, id, actorId, status) {
    const thread = await getThreadRow(db, id);
    if (thread.status === status)
        return getThreadForStaff(db, id);
    const now = new Date();
    const actorName = await (0, identity_2.getActorName)(db, actorId);
    await db
        .update(culture_1.cultureThreads)
        .set({ status: status === "CLOSED" ? "CLOSED" : thread.lastMessageBy === "ADVISOR" ? "ANSWERED" : "OPEN", closedAt: status === "CLOSED" ? now : null, updatedAt: now })
        .where((0, drizzle_orm_1.eq)(culture_1.cultureThreads.id, id));
    await db.insert(culture_1.cultureMessages).values({
        id: newId("cmsg"),
        threadId: id,
        authorId: actorId,
        authorType: "SYSTEM",
        authorName: null,
        content: status === "CLOSED" ? `Échange clos par ${actorName}.` : `Échange rouvert par ${actorName}.`,
        isInternal: false,
    });
    if (status === "CLOSED") {
        await (0, notifications_1.createNotification)(db, {
            userId: thread.userId,
            type: "CULTURE",
            title: `Échange ${thread.reference} clos`,
            body: `Votre échange « ${thread.subject} » avec le Conseiller Culturel est clos. Vous pouvez en ouvrir un nouveau à tout moment.`,
            payload: { cultureThreadId: id, reference: thread.reference },
            actionUrl: `/culture/echanges/${id}`,
        });
    }
    return getThreadForStaff(db, id);
}
async function requesterSummary(db, userId) {
    const u = await (0, identity_2.getUser)(db, userId);
    return u ? { id: u.id, name: [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(" ") || u.email, email: u.email, phone: u.phone ?? null, inue: u.profile?.inue ?? null } : null;
}
//# sourceMappingURL=culture.js.map