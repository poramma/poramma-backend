"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TICKET_PRIORITIES = exports.TICKET_STATUSES = exports.TICKET_CATEGORIES = void 0;
exports.listAdminIds = listAdminIds;
exports.listAssignees = listAssignees;
exports.createTicket = createTicket;
exports.listTicketsForUser = listTicketsForUser;
exports.getTicketForUser = getTicketForUser;
exports.addUserMessage = addUserMessage;
exports.resolveByUser = resolveByUser;
exports.listTickets = listTickets;
exports.getTicketForStaff = getTicketForStaff;
exports.addStaffMessage = addStaffMessage;
exports.updateTicket = updateTicket;
const crypto_1 = __importDefault(require("crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const utils_1 = require("@poramma/utils");
const support_1 = require("../schema/support");
const identity_1 = require("../schema/identity");
const identity_2 = require("./identity");
const notifications_1 = require("./notifications");
exports.TICKET_CATEGORIES = ["ACCOUNT", "DEMANDE", "RENDEZ_VOUS", "REGISTRATION", "TECHNICAL", "OTHER"];
exports.TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"];
exports.TICKET_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
const ACTIVE_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_USER"];
const CATEGORY_LABEL = {
    ACCOUNT: "Compte et connexion",
    DEMANDE: "Une demande",
    RENDEZ_VOUS: "Un rendez-vous",
    REGISTRATION: "Enregistrement / INUE",
    TECHNICAL: "Problème technique",
    OTHER: "Autre question",
};
const STATUS_LABEL = {
    OPEN: "Ouvert",
    IN_PROGRESS: "En cours de traitement",
    WAITING_USER: "En attente de votre réponse",
    RESOLVED: "Résolu",
    CLOSED: "Clôturé",
};
const PRIORITY_LABEL = { LOW: "Basse", NORMAL: "Normale", HIGH: "Haute", URGENT: "Urgente" };
const EMBASSY_LABEL = "Ambassade du Mali";
function newId(prefix) {
    return `${prefix}-${crypto_1.default.randomUUID()}`;
}
async function newReference(db) {
    for (let i = 0; i < 6; i++) {
        const reference = `SUP-${new Date().getFullYear()}-${crypto_1.default.randomBytes(3).toString("hex").toUpperCase()}`;
        const [clash] = await db.select({ id: support_1.supportTickets.id }).from(support_1.supportTickets).where((0, drizzle_orm_1.eq)(support_1.supportTickets.reference, reference));
        if (!clash)
            return reference;
    }
    throw new utils_1.ConflictError("Impossible de générer un numéro de ticket, réessayez.");
}
const excerpt = (text, max = 220) => (text.length > max ? `${text.slice(0, max)}…` : text);
async function listAdminIds(db) {
    const rows = await db
        .selectDistinct({ userId: identity_1.identityUserRoles.userId })
        .from(identity_1.identityUserRoles)
        .innerJoin(identity_1.identityRoles, (0, drizzle_orm_1.eq)(identity_1.identityRoles.id, identity_1.identityUserRoles.roleId))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(identity_1.identityRoles.name, "ADMIN"), (0, drizzle_orm_1.eq)(identity_1.identityUserRoles.isActive, true)));
    return rows.map((r) => r.userId);
}
async function listAssignees(db) {
    const ids = await listAdminIds(db);
    const users = await (0, identity_2.getUsersByIds)(db, ids);
    return ids
        .map((id) => {
        const p = users.get(id)?.profile;
        return { id, name: p ? [p.firstName, p.lastName].filter(Boolean).join(" ") || users.get(id)?.email || "Administrateur" : users.get(id)?.email ?? "Administrateur" };
    })
        .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}
async function staffRecipients(db, ticket, exceptUserId) {
    const ids = ticket.assignedTo ? [ticket.assignedTo] : await listAdminIds(db);
    return ids.filter((id) => id !== exceptUserId);
}
async function notifyStaff(db, ticket, params) {
    for (const userId of await staffRecipients(db, ticket, params.exceptUserId)) {
        await (0, notifications_1.createNotification)(db, {
            userId,
            type: "ADMIN",
            title: params.title,
            body: params.body,
            payload: { supportTicketId: ticket.id, reference: ticket.reference },
            actionUrl: `/support-tickets/${ticket.id}`,
            email: params.email === false ? undefined : { subject: `[Support ${ticket.reference}] ${params.title}` },
        });
    }
}
async function notifyRequester(db, ticket, params) {
    await (0, notifications_1.createNotification)(db, {
        userId: ticket.userId,
        type: "ADMIN",
        title: params.title,
        body: params.body,
        payload: { supportTicketId: ticket.id, reference: ticket.reference },
        actionUrl: `/support/tickets/${ticket.id}`,
        email: { subject: `${params.title} (${ticket.reference})`, actionLabel: params.actionLabel },
    });
}
async function addEvent(db, ticketId, content, internal, actor) {
    await db.insert(support_1.supportTicketMessages).values({
        id: newId("tmsg"),
        ticketId,
        authorId: actor?.id ?? null,
        authorType: "SYSTEM",
        authorName: internal ? actor?.name ?? null : null,
        content,
        isInternal: internal,
    });
}
async function getTicketRow(db, id) {
    const [row] = await db.select().from(support_1.supportTickets).where((0, drizzle_orm_1.eq)(support_1.supportTickets.id, id));
    if (!row)
        throw new utils_1.NotFoundError("Ticket introuvable");
    return row;
}
function publicTicket(t) {
    return {
        id: t.id,
        reference: t.reference,
        subject: t.subject,
        category: t.category,
        linkedReference: t.linkedReference,
        status: t.status,
        createdAt: t.createdAt,
        lastMessageAt: t.lastMessageAt,
        lastMessageBy: t.lastMessageBy,
        resolvedAt: t.resolvedAt,
    };
}
function publicMessage(m, requesterName) {
    return {
        id: m.id,
        authorType: m.authorType,
        authorName: m.authorType === "USER" ? requesterName : m.authorType === "STAFF" ? EMBASSY_LABEL : null,
        content: m.content,
        createdAt: m.createdAt,
    };
}
async function requesterName(db, userId) {
    return (0, identity_2.getActorName)(db, userId);
}
async function createTicket(db, userId, data) {
    const reference = await newReference(db);
    const id = newId("tkt");
    const user = await (0, identity_2.getUser)(db, userId);
    const name = user?.profile ? [user.profile.firstName, user.profile.lastName].filter(Boolean).join(" ") : "";
    const [ticket] = await db
        .insert(support_1.supportTickets)
        .values({ id, reference, userId, category: data.category, subject: data.subject, linkedReference: data.linkedReference ?? null })
        .returning();
    await db.insert(support_1.supportTicketMessages).values({
        id: newId("tmsg"),
        ticketId: id,
        authorId: userId,
        authorType: "USER",
        authorName: name || null,
        content: data.message,
    });
    const contact = [user?.email, user?.phone, user?.profile?.inue ? `INUE ${user.profile.inue}` : null].filter(Boolean).join(" — ");
    await notifyStaff(db, ticket, {
        title: `Nouveau ticket ${reference} — ${data.subject}`,
        body: `${name || "Un usager"} (${contact}) — ${CATEGORY_LABEL[data.category] ?? data.category}${data.linkedReference ? ` — Réf. ${data.linkedReference}` : ""}\n\n${excerpt(data.message)}`,
    });
    await notifyRequester(db, ticket, {
        title: "Votre message a bien été transmis",
        body: `Nous avons reçu votre message « ${data.subject} ». Numéro de suivi : ${reference}. Vous serez prévenu(e) dès qu'un agent vous répond.`,
        actionLabel: "Suivre mon ticket",
    });
    return publicTicket(ticket);
}
async function listTicketsForUser(db, userId) {
    const rows = await db.select().from(support_1.supportTickets).where((0, drizzle_orm_1.eq)(support_1.supportTickets.userId, userId)).orderBy((0, drizzle_orm_1.desc)(support_1.supportTickets.lastMessageAt));
    return rows.map(publicTicket);
}
async function getTicketForUser(db, userId, id) {
    const ticket = await getTicketRow(db, id);
    if (ticket.userId !== userId)
        throw new utils_1.NotFoundError("Ticket introuvable");
    const [messages, name] = await Promise.all([
        db
            .select()
            .from(support_1.supportTicketMessages)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(support_1.supportTicketMessages.ticketId, id), (0, drizzle_orm_1.eq)(support_1.supportTicketMessages.isInternal, false)))
            .orderBy(support_1.supportTicketMessages.createdAt),
        requesterName(db, userId),
    ]);
    return { ...publicTicket(ticket), messages: messages.map((m) => publicMessage(m, name)) };
}
async function addUserMessage(db, userId, id, content) {
    const ticket = await getTicketRow(db, id);
    if (ticket.userId !== userId)
        throw new utils_1.NotFoundError("Ticket introuvable");
    if (ticket.status === "CLOSED")
        throw new utils_1.ConflictError("Ce ticket est clôturé. Ouvrez un nouveau ticket si vous avez encore besoin d'aide.");
    const name = await requesterName(db, userId);
    const [message] = await db
        .insert(support_1.supportTicketMessages)
        .values({ id: newId("tmsg"), ticketId: id, authorId: userId, authorType: "USER", authorName: name, content })
        .returning();
    const reopened = ticket.status === "RESOLVED";
    const nextStatus = reopened ? "OPEN" : ticket.status === "WAITING_USER" ? "IN_PROGRESS" : ticket.status;
    const [updated] = await db
        .update(support_1.supportTickets)
        .set({ status: nextStatus, resolvedAt: reopened ? null : ticket.resolvedAt, lastMessageAt: new Date(), lastMessageBy: "USER", updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(support_1.supportTickets.id, id))
        .returning();
    if (reopened)
        await addEvent(db, id, "Ticket rouvert : l'usager a répondu.", false);
    await notifyStaff(db, updated, {
        title: `${reopened ? "Ticket rouvert" : "Nouvelle réponse"} — ${ticket.reference}`,
        body: `${name} : ${excerpt(content)}`,
    });
    return publicMessage(message, name);
}
async function resolveByUser(db, userId, id) {
    const ticket = await getTicketRow(db, id);
    if (ticket.userId !== userId)
        throw new utils_1.NotFoundError("Ticket introuvable");
    if (ticket.status === "CLOSED" || ticket.status === "RESOLVED")
        return publicTicket(ticket);
    const [updated] = await db.update(support_1.supportTickets).set({ status: "RESOLVED", resolvedAt: new Date(), updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(support_1.supportTickets.id, id)).returning();
    await addEvent(db, id, "Marqué comme résolu par l'usager.", false);
    await notifyStaff(db, updated, { title: `Ticket résolu par l'usager — ${ticket.reference}`, body: `« ${ticket.subject} » a été marqué comme résolu.`, email: false });
    return publicTicket(updated);
}
async function enrichStaff(db, rows) {
    const users = await (0, identity_2.getUsersByIds)(db, rows.flatMap((t) => [t.userId, t.assignedTo].filter((x) => !!x)));
    const nameOf = (id) => {
        if (!id)
            return null;
        const u = users.get(id);
        if (!u)
            return null;
        return [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(" ") || u.email;
    };
    return rows.map((t) => {
        const u = users.get(t.userId);
        return {
            id: t.id,
            reference: t.reference,
            subject: t.subject,
            category: t.category,
            linkedReference: t.linkedReference,
            status: t.status,
            priority: t.priority,
            requester: { id: t.userId, name: nameOf(t.userId), email: u?.email ?? null, phone: u?.phone ?? null, inue: u?.profile?.inue ?? null },
            assignee: t.assignedTo ? { id: t.assignedTo, name: nameOf(t.assignedTo) } : null,
            createdAt: t.createdAt,
            lastMessageAt: t.lastMessageAt,
            lastMessageBy: t.lastMessageBy,
            firstResponseAt: t.firstResponseAt,
            resolvedAt: t.resolvedAt,
            closedAt: t.closedAt,
        };
    });
}
async function listTickets(db, actorId, filters) {
    const conditions = [];
    if (filters.status === "ACTIVE")
        conditions.push((0, drizzle_orm_1.inArray)(support_1.supportTickets.status, ACTIVE_STATUSES));
    else if (filters.status)
        conditions.push((0, drizzle_orm_1.eq)(support_1.supportTickets.status, filters.status));
    if (filters.category)
        conditions.push((0, drizzle_orm_1.eq)(support_1.supportTickets.category, filters.category));
    if (filters.priority)
        conditions.push((0, drizzle_orm_1.eq)(support_1.supportTickets.priority, filters.priority));
    if (filters.assigned === "me")
        conditions.push((0, drizzle_orm_1.eq)(support_1.supportTickets.assignedTo, actorId));
    else if (filters.assigned === "unassigned")
        conditions.push((0, drizzle_orm_1.isNull)(support_1.supportTickets.assignedTo));
    else if (filters.assigned)
        conditions.push((0, drizzle_orm_1.eq)(support_1.supportTickets.assignedTo, filters.assigned));
    if (filters.search?.trim()) {
        const s = `%${filters.search.trim()}%`;
        const requesterIds = db
            .select({ id: identity_1.identityUsers.id })
            .from(identity_1.identityUsers)
            .leftJoin(identity_1.identityUserProfiles, (0, drizzle_orm_1.eq)(identity_1.identityUserProfiles.userId, identity_1.identityUsers.id))
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(identity_1.identityUsers.email, s), (0, drizzle_orm_1.ilike)(identity_1.identityUserProfiles.firstName, s), (0, drizzle_orm_1.ilike)(identity_1.identityUserProfiles.lastName, s)));
        conditions.push((0, drizzle_orm_1.or)((0, drizzle_orm_1.ilike)(support_1.supportTickets.reference, s), (0, drizzle_orm_1.ilike)(support_1.supportTickets.subject, s), (0, drizzle_orm_1.ilike)(support_1.supportTickets.linkedReference, s), (0, drizzle_orm_1.inArray)(support_1.supportTickets.userId, requesterIds)));
    }
    const where = conditions.length ? (0, drizzle_orm_1.and)(...conditions) : undefined;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const finishedLast = (0, drizzle_orm_1.sql) `CASE WHEN ${support_1.supportTickets.status} IN ('RESOLVED','CLOSED') THEN 1 ELSE 0 END`;
    const priorityWeight = (0, drizzle_orm_1.sql) `CASE ${support_1.supportTickets.priority} WHEN 'URGENT' THEN 3 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 1 ELSE 0 END`;
    const [rows, [{ total }], statusCounts, [{ unassigned }], [{ mine }]] = await Promise.all([
        db
            .select()
            .from(support_1.supportTickets)
            .where(where)
            .orderBy(finishedLast, (0, drizzle_orm_1.sql) `${priorityWeight} DESC`, (0, drizzle_orm_1.desc)(support_1.supportTickets.lastMessageAt))
            .limit(limit)
            .offset((page - 1) * limit),
        db.select({ total: (0, drizzle_orm_1.sql) `count(*)::int` }).from(support_1.supportTickets).where(where),
        db.select({ status: support_1.supportTickets.status, n: (0, drizzle_orm_1.sql) `count(*)::int` }).from(support_1.supportTickets).groupBy(support_1.supportTickets.status),
        db
            .select({ unassigned: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(support_1.supportTickets)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.isNull)(support_1.supportTickets.assignedTo), (0, drizzle_orm_1.inArray)(support_1.supportTickets.status, ACTIVE_STATUSES))),
        db
            .select({ mine: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(support_1.supportTickets)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(support_1.supportTickets.assignedTo, actorId), (0, drizzle_orm_1.inArray)(support_1.supportTickets.status, ACTIVE_STATUSES))),
    ]);
    const byStatus = Object.fromEntries(statusCounts.map((c) => [c.status, c.n]));
    return {
        data: await enrichStaff(db, rows),
        total,
        page,
        limit,
        stats: {
            open: byStatus.OPEN ?? 0,
            inProgress: byStatus.IN_PROGRESS ?? 0,
            waitingUser: byStatus.WAITING_USER ?? 0,
            resolved: byStatus.RESOLVED ?? 0,
            closed: byStatus.CLOSED ?? 0,
            unassigned,
            mine,
        },
    };
}
async function getTicketForStaff(db, id) {
    const ticket = await getTicketRow(db, id);
    const [[enriched], messages] = await Promise.all([
        enrichStaff(db, [ticket]),
        db.select().from(support_1.supportTicketMessages).where((0, drizzle_orm_1.eq)(support_1.supportTicketMessages.ticketId, id)).orderBy(support_1.supportTicketMessages.createdAt),
    ]);
    return {
        ...enriched,
        messages: messages.map((m) => ({
            id: m.id,
            authorType: m.authorType,
            authorName: m.authorName,
            content: m.content,
            isInternal: m.isInternal,
            createdAt: m.createdAt,
        })),
    };
}
async function addStaffMessage(db, id, actorId, content, isInternal) {
    const ticket = await getTicketRow(db, id);
    if (ticket.status === "CLOSED" && !isInternal)
        throw new utils_1.ConflictError("Ce ticket est clôturé : rouvrez-le avant de répondre à l'usager.");
    const actorName = await (0, identity_2.getActorName)(db, actorId);
    await db.insert(support_1.supportTicketMessages).values({ id: newId("tmsg"), ticketId: id, authorId: actorId, authorType: "STAFF", authorName: actorName, content, isInternal });
    if (isInternal) {
        await db.update(support_1.supportTickets).set({ updatedAt: new Date() }).where((0, drizzle_orm_1.eq)(support_1.supportTickets.id, id));
        return getTicketForStaff(db, id);
    }
    const now = new Date();
    const [updated] = await db
        .update(support_1.supportTickets)
        .set({
        status: "WAITING_USER",
        resolvedAt: null,
        firstResponseAt: ticket.firstResponseAt ?? now,
        assignedTo: ticket.assignedTo ?? actorId,
        lastMessageAt: now,
        lastMessageBy: "STAFF",
        updatedAt: now,
    })
        .where((0, drizzle_orm_1.eq)(support_1.supportTickets.id, id))
        .returning();
    await notifyRequester(db, updated, {
        title: `Réponse à votre ticket ${ticket.reference}`,
        body: `L'ambassade a répondu à « ${ticket.subject} » :\n\n${excerpt(content)}`,
        actionLabel: "Voir la réponse",
    });
    return getTicketForStaff(db, id);
}
async function updateTicket(db, id, actorId, patch) {
    const ticket = await getTicketRow(db, id);
    if (ticket.status === "CLOSED")
        throw new utils_1.ConflictError("Ce ticket est clôturé : il ne peut plus être modifié.");
    if (patch.status && !exports.TICKET_STATUSES.includes(patch.status))
        throw new utils_1.ValidationError("Statut invalide", { status: ["invalid"] });
    if (patch.priority && !exports.TICKET_PRIORITIES.includes(patch.priority))
        throw new utils_1.ValidationError("Priorité invalide", { priority: ["invalid"] });
    const actorName = await (0, identity_2.getActorName)(db, actorId);
    const actor = { id: actorId, name: actorName };
    const now = new Date();
    const set = { updatedAt: now };
    const events = [];
    let notifyStatus = null;
    let nextAssignee = patch.assignedTo;
    if (patch.status === "IN_PROGRESS" && patch.assignedTo === undefined && !ticket.assignedTo)
        nextAssignee = actorId;
    if (nextAssignee !== undefined && nextAssignee !== ticket.assignedTo) {
        if (nextAssignee && !(await listAdminIds(db)).includes(nextAssignee))
            throw new utils_1.ValidationError("Cet utilisateur ne peut pas traiter les tickets", { assignedTo: ["not an admin"] });
        set.assignedTo = nextAssignee;
        events.push({ text: nextAssignee ? `Assigné à ${await (0, identity_2.getActorName)(db, nextAssignee)}` : "Assignation retirée", internal: true });
    }
    if (patch.priority && patch.priority !== ticket.priority) {
        set.priority = patch.priority;
        events.push({ text: `Priorité : ${PRIORITY_LABEL[patch.priority]}`, internal: true });
    }
    if (patch.status && patch.status !== ticket.status) {
        set.status = patch.status;
        if (patch.status === "RESOLVED")
            set.resolvedAt = now;
        else if (patch.status === "CLOSED") {
            set.closedAt = now;
            set.resolvedAt = ticket.resolvedAt ?? now;
        }
        else
            set.resolvedAt = null;
        events.push({ text: `Statut : ${STATUS_LABEL[patch.status]}`, internal: false });
        notifyStatus = patch.status;
    }
    if (Object.keys(set).length === 1)
        return getTicketForStaff(db, id);
    const [updated] = await db.update(support_1.supportTickets).set(set).where((0, drizzle_orm_1.eq)(support_1.supportTickets.id, id)).returning();
    for (const e of events)
        await addEvent(db, id, e.text, e.internal, actor);
    if (set.assignedTo && set.assignedTo !== actorId) {
        await (0, notifications_1.createNotification)(db, {
            userId: set.assignedTo,
            type: "ADMIN",
            title: `Ticket assigné — ${ticket.reference}`,
            body: `${actorName} vous a assigné « ${ticket.subject} ».`,
            payload: { supportTicketId: id, reference: ticket.reference },
            actionUrl: `/support-tickets/${id}`,
        });
    }
    if (notifyStatus === "IN_PROGRESS") {
        await notifyRequester(db, updated, { title: `Votre ticket ${ticket.reference} est pris en charge`, body: `Un agent de l'ambassade traite « ${ticket.subject} ».`, actionLabel: "Suivre mon ticket" });
    }
    else if (notifyStatus === "RESOLVED") {
        await notifyRequester(db, updated, { title: `Ticket ${ticket.reference} résolu`, body: `Votre demande « ${ticket.subject} » a été marquée comme résolue. Si le problème persiste, répondez simplement dans le ticket.`, actionLabel: "Voir mon ticket" });
    }
    else if (notifyStatus === "CLOSED") {
        await notifyRequester(db, updated, { title: `Ticket ${ticket.reference} clôturé`, body: `Votre demande « ${ticket.subject} » est clôturée. Pour toute nouvelle question, ouvrez un nouveau ticket.`, actionLabel: "Voir mon ticket" });
    }
    return getTicketForStaff(db, id);
}
//# sourceMappingURL=support.js.map